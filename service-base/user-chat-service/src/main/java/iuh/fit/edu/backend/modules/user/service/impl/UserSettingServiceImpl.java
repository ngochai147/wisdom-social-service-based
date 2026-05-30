package iuh.fit.edu.backend.modules.user.service.impl;

import iuh.fit.edu.backend.modules.user.constant.Gender;
import iuh.fit.edu.backend.modules.post.constant.PrivacyType;
import iuh.fit.edu.backend.modules.user.entity.User;
import iuh.fit.edu.backend.modules.user.entity.UserSetting;
import iuh.fit.edu.backend.modules.user.dto.response.UserProfileResponse;
import iuh.fit.edu.backend.modules.user.repository.FollowRepository;
import iuh.fit.edu.backend.modules.user.repository.FriendRepository;
import iuh.fit.edu.backend.modules.user.repository.UserSettingRepository;
import iuh.fit.edu.backend.modules.post.repository.PostRepository;
import iuh.fit.edu.backend.modules.user.service.FriendService;
import iuh.fit.edu.backend.modules.user.service.UserService;
import iuh.fit.edu.backend.modules.user.service.UserSettingService;
import org.springframework.stereotype.Service;

import java.util.List;

/*
 * @description: Repository for Follow entity
 * @author: The Bao
 * @date: 2026-03-19
 * @versio:n 1.0
 */

@Service
public class UserSettingServiceImpl implements UserSettingService {
    UserService userService;
    FriendService friendService;
    UserSettingRepository userSettingRepository;
    FollowRepository followRepository;
    FriendRepository friendRepository;
    PostRepository postRepository;

    public UserSettingServiceImpl(FriendService friendService,
                                  UserService userService, 
                                  UserSettingRepository userSettingRepository,
                                  FollowRepository followRepository,
                                  FriendRepository friendRepository,
                                  PostRepository postRepository) {
        this.friendService = friendService;
        this.userService = userService;
        this.userSettingRepository = userSettingRepository;
        this.followRepository = followRepository;
        this.friendRepository = friendRepository;
        this.postRepository = postRepository;
    }

    @Override
    public UserProfileResponse getProfileUser(long id) {
        User user = userService.findUserById(id);
        User userCurrent = userService.getCurrentUser();
        UserSetting userSetting = userSettingRepository.findById(user.getId()).orElse(null);

        // Check privacy settings
        boolean isPublic = userSetting == null || PrivacyType.PUBLIC.equals(userSetting.getPrivacyProfile());
        boolean isFriendsOnly = userSetting != null && PrivacyType.FRIENDS.equals(userSetting.getPrivacyProfile());
        boolean isPrivate = userSetting != null && PrivacyType.ONLY_ME.equals(userSetting.getPrivacyProfile());

        // Apply privacy rules
        if (isPrivate) {
            return buildHiddenProfile(user);
        }
        
        if (isFriendsOnly && userCurrent != null) {
            List<User> friends = friendService.getFriendsOfUser(id);
            boolean isFriend = friends.stream().anyMatch(f -> f.getId().equals(userCurrent.getId()));
            if (!isFriend) {
                return buildHiddenProfile(user);
            }
        }

        // Calculate dynamic statistics
        long friendCount = friendRepository.findFriendsByUser(user).size();
        long followerCount = followRepository.countByFollowing(user);
        long followingCount = followRepository.countByFollower(user);
        long postCount = postRepository.countByAuthorId(user.getId());

        // Build and return response with stats
        return UserProfileResponse.builder()
                .id(user.getId())
                .phone(user.getPhone())
                .name(user.getName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .birthday(user.getBirthday())
                .bio(user.getBio())
                .gender(user.getGender())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .friendsCount(friendCount)
                .followersCount(followerCount)
                .followingCount(followingCount)
                .postsCount(postCount)
                .build();
    }

    private UserProfileResponse buildHiddenProfile(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .phone("*****")
                .name("*****")
                .username("*****")
                .avatarUrl(null)
                .birthday("*****")
                .bio("*****")
                .gender(Gender.OTHER)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .friendsCount(0L)
                .followersCount(0L)
                .followingCount(0L)
                .postsCount(0L)
                .build();
    }
}
