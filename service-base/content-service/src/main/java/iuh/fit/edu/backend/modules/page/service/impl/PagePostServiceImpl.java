package iuh.fit.edu.backend.modules.page.service.impl;

import iuh.fit.edu.backend.modules.page.constant.PageRole;
import iuh.fit.edu.backend.modules.post.constant.PostStatus;
import iuh.fit.edu.backend.modules.page.entity.PagePost;
import iuh.fit.edu.backend.modules.user.entity.User;
import iuh.fit.edu.backend.modules.post.entity.Post;
import iuh.fit.edu.backend.modules.page.repository.PageMemberRepository;
import iuh.fit.edu.backend.modules.page.repository.PagePostRepository;
import iuh.fit.edu.backend.modules.page.repository.PageRepository;
import iuh.fit.edu.backend.modules.post.repository.PostRepository;
import iuh.fit.edu.backend.modules.page.service.PagePostService;
import iuh.fit.edu.backend.modules.page.event.publisher.PageEventPublisher;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class PagePostServiceImpl implements PagePostService {
    private final PostRepository postRepository;
    private final PagePostRepository pagePostRepository;
    private final PageRepository pageRepository;
    private final PageMemberRepository pageMemberRepository;
    private final PageEventPublisher pageEventPublisher;

    public PagePostServiceImpl(PageMemberRepository pageMemberRepository,
                               PostRepository postRepository,
                               PagePostRepository pagePostRepository,
                               PageRepository pageRepository,
                               PageEventPublisher pageEventPublisher) {
        this.pageMemberRepository = pageMemberRepository;
        this.postRepository = postRepository;
        this.pagePostRepository = pagePostRepository;
        this.pageRepository = pageRepository;
        this.pageEventPublisher = pageEventPublisher;
    }

    @Override
    public boolean approvePostPage(long userId, long pageId, ObjectId postId) {

        if (isPageAdminOrMorderator(userId, pageId)) return false;

        PagePost pagePost = pagePostRepository
                .findByPostIdAndPage_Id(postId.toString(), pageId);

        if (pagePost == null) return false;

        pagePost.setStatus(PostStatus.APPROVED);
        pagePost.setApprovedBy(User.builder().id(userId).build());
        pagePost.setApprovedAt(OffsetDateTime.now());

        pagePostRepository.save(pagePost);

        // Publish approved event with the full post payload
        Post post = postRepository.findById(postId.toString()).orElse(null);
        pageEventPublisher.publishPostApproved(pageId, postId.toString(), userId, post);

        return true;
    }

    @Override
    public boolean cancelApprovePostPage(long userId, long pageId, ObjectId postId) {

        if (isPageAdminOrMorderator(userId, pageId)) return false;

        PagePost pagePost = pagePostRepository
                .findByPostIdAndPage_Id(postId.toHexString(), pageId);

        if (pagePost == null) return false;

        pagePost.setStatus(PostStatus.REJECTED);
        pagePost.setApprovedBy(null);
        pagePost.setApprovedAt(null);

        pagePostRepository.save(pagePost);

        // Publish rejected event
        pageEventPublisher.publishPostRejected(pageId, postId.toString(), userId);

        return true;
    }

    @Override
    public boolean addPostPage(long userId, long pageId, Post post) {

        if (!pageRepository.existsById(pageId)) return false;

        // lưu post vào Mongo
        post.setAuthorId(String.valueOf(userId));
        post.setCreatedAt(Instant.now());
        Post savedPost = postRepository.save(post);

        // lưu metadata vào SQL
        PagePost pagePost = new PagePost();
        pagePost.setPostId(savedPost.getId());
        pagePost.setPage(pageRepository.getReferenceById(pageId));
        pagePost.setStatus(PostStatus.PENDING);
        pagePost.setCreatedAt(OffsetDateTime.now());

        pagePostRepository.save(pagePost);

        // Publish submitted event with the full post payload
        pageEventPublisher.publishPostSubmitted(pageId, savedPost.getId(), userId, savedPost);

        return true;
    }

    @Override
    public boolean removePostPage(long userId, long pageId, ObjectId postId) {

        PagePost pagePost = pagePostRepository
                .findByPostIdAndPage_Id(postId.toHexString(), pageId);

        if (pagePost == null) return false;

        boolean isAdminOrMod = !isPageAdminOrMorderator(userId, pageId);

        if (!isAdminOrMod) {
            // Not admin/mod — only allow if the post is PENDING and authored by this user
            if (pagePost.getStatus() != PostStatus.PENDING) return false;
            Post post = postRepository.findById(postId.toString()).orElse(null);
            if (post == null || !String.valueOf(userId).equals(post.getAuthorId())) return false;
        }

        pagePostRepository.delete(pagePost);
        postRepository.deleteById(postId.toString());

        // Publish removed event
        pageEventPublisher.publishPostRemoved(pageId, postId.toString(), userId);

        return true;
    }

    @Override
    public List<Post> getAllPostOfPage(long pageId) {
        List<PagePost> pagePostList = pagePostRepository
                .findByPage_IdAndStatus(pageId, PostStatus.APPROVED);

        pagePostList.stream()
                .map(pagePost -> postRepository.findById(pagePost.getPostId()).orElse(null))
                .toList().forEach(System.out::println);

        return pagePostList.stream()
                .map(pagePost -> postRepository.findById(pagePost.getPostId()).orElse(null))
                .toList();
    }

    @Override
    public List<Post> getAllPostWaitingForApproveOfPage(long userId, long pageId) {
        if (isPageAdminOrMorderator(userId, pageId)) return List.of();

        List<PagePost> pagePostList = pagePostRepository
                .findByPage_IdAndStatus(pageId, PostStatus.PENDING);

        return pagePostList.stream()
                .map(pagePost -> postRepository.findById(pagePost.getPostId()).orElse(null))
                .toList();
    }

    @Override
    public List<Post> getMyPendingPostsOfPage(long userId, long pageId) {
        List<PagePost> pagePostList = pagePostRepository
                .findByPage_IdAndStatus(pageId, PostStatus.PENDING);

        String authorIdStr = String.valueOf(userId);
        return pagePostList.stream()
                .map(pagePost -> postRepository.findById(pagePost.getPostId()).orElse(null))
                .filter(post -> post != null && authorIdStr.equals(post.getAuthorId()))
                .toList();
    }

    @Override
    public boolean approveAllPostPage(long userId, long pageId) {
        if (isPageAdminOrMorderator(userId, pageId)) return false;

        List<PagePost> pagePostList = pagePostRepository
                .findByPage_IdAndStatus(pageId, PostStatus.PENDING);

        pagePostList.forEach(pagePost -> {
            pagePost.setStatus(PostStatus.APPROVED);
            pagePost.setApprovedBy(User.builder().id(userId).build());
            pagePost.setApprovedAt(OffsetDateTime.now());
            pagePostRepository.save(pagePost);
            // Publish approved event for each post
            Post post = postRepository.findById(pagePost.getPostId()).orElse(null);
            pageEventPublisher.publishPostApproved(pageId, pagePost.getPostId(), userId, post);
        });

        return !pagePostList.isEmpty();
    }

    @Override
    public boolean cancelAllPostPage(long userId, long pageId) {
        if (isPageAdminOrMorderator(userId, pageId)) return false;

        List<PagePost> pagePostList = pagePostRepository
                .findByPage_IdAndStatus(pageId, PostStatus.PENDING);

        pagePostList.forEach(pagePost -> {
            pagePost.setStatus(PostStatus.REJECTED);
            pagePost.setApprovedBy(null);
            pagePost.setApprovedAt(null);
            pagePostRepository.save(pagePost);
            // Publish rejected event for each post
            pageEventPublisher.publishPostRejected(pageId, pagePost.getPostId(), userId);
        });

        return !pagePostList.isEmpty();
    }

    @Override
    public PagePost getPagePostByIdandPostId(long pageId, ObjectId postId) {
        return pagePostRepository.findPagePostByPage_IdAndPostId(pageId, postId.toString());
    }

    private boolean isPageAdminOrMorderator(long userId, long pageId) {
        return !pageMemberRepository
                .existsByUserIdAndPageIdAndRoleIn(
                        userId,
                        pageId,
                        List.of(PageRole.ADMIN, PageRole.MODERATOR)
                );
    }
}
