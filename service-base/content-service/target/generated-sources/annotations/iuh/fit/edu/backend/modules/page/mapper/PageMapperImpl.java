package iuh.fit.edu.backend.modules.page.mapper;

import iuh.fit.edu.backend.modules.page.dto.request.UserRequestCreatePage;
import iuh.fit.edu.backend.modules.page.entity.Page;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-05-30T20:42:07+0700",
    comments = "version: 1.6.3, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class PageMapperImpl implements PageMapper {

    @Override
    public Page CreateRequestPagetoPage(UserRequestCreatePage createPage) {
        if ( createPage == null ) {
            return null;
        }

        Page.PageBuilder page = Page.builder();

        page.name( createPage.getName() );
        page.username( createPage.getUsername() );
        page.category( createPage.getCategory() );
        page.description( createPage.getDescription() );
        page.avatarUrl( createPage.getAvatarUrl() );
        page.coverUrl( createPage.getCoverUrl() );
        page.phone( createPage.getPhone() );
        page.email( createPage.getEmail() );
        page.website( createPage.getWebsite() );
        page.address( createPage.getAddress() );
        page.isVerified( createPage.getIsVerified() );
        page.status( createPage.getStatus() );
        page.createdAt( createPage.getCreatedAt() );
        page.updatedAt( createPage.getUpdatedAt() );

        return page.build();
    }
}
