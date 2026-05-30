package iuh.fit.edu.backend.modules.user.mapper;

import iuh.fit.edu.backend.modules.user.dto.request.UserRequestRegister;
import iuh.fit.edu.backend.modules.user.dto.response.UserResponseRegister;
import iuh.fit.edu.backend.modules.user.entity.User;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-05-30T20:42:13+0700",
    comments = "version: 1.6.3, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public User UserRegistertoUser(UserRequestRegister register) {
        if ( register == null ) {
            return null;
        }

        User.UserBuilder user = User.builder();

        user.phone( register.getPhone() );

        return user.build();
    }

    @Override
    public UserResponseRegister UsertoUserRegisterResponse(User user) {
        if ( user == null ) {
            return null;
        }

        UserResponseRegister userResponseRegister = new UserResponseRegister();

        userResponseRegister.setBirthday( user.getBirthday() );
        userResponseRegister.setCreatedAt( user.getCreatedAt() );
        userResponseRegister.setGender( user.getGender() );
        userResponseRegister.setPhone( user.getPhone() );
        userResponseRegister.setUsername( user.getUsername() );

        return userResponseRegister;
    }
}
