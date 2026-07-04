package com.etsaion;

import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.etsaion.entity.StudentRoster;
import com.etsaion.entity.User;
import com.etsaion.service.StudentRosterService;
import com.etsaion.service.impl.UserServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceRosterSyncTest {

    @Test
    void syncStudentAccountsFromRosterCreatesAndRepairsAccounts() {
        UserServiceImpl userService = spy(new UserServiceImpl());
        StudentRosterService rosterService = mock(StudentRosterService.class);
        ReflectionTestUtils.setField(userService, "studentRosterService", rosterService);

        StudentRoster existingRoster = roster("202408014104", "陈思怡");
        StudentRoster missingRoster = roster("202408384101", "陈冬妮");
        when(rosterService.list(any(LambdaQueryWrapper.class))).thenReturn(List.of(existingRoster, missingRoster));
        when(rosterService.getMajorNameById(1L)).thenReturn("人工智能");
        when(rosterService.getClassNameById(2L)).thenReturn("2024人工智能1班");

        User existingUser = new User();
        existingUser.setId(21L);
        existingUser.setUsername("202408014104");
        existingUser.setPassword(BCrypt.hashpw("wrong-password", BCrypt.gensalt()));
        existingUser.setRole("student");

        doReturn(existingUser)
                .doReturn(null)
                .when(userService)
                .getOne(any(LambdaQueryWrapper.class));
        doReturn(true).when(userService).save(any(User.class));
        doReturn(true).when(userService).updateById(any(User.class));

        Map<String, Object> result = userService.syncStudentAccountsFromRoster("2024", true);

        assertEquals(2, result.get("totalRoster"));
        assertEquals(1, result.get("created"));
        assertEquals(1, result.get("updated"));
        assertEquals(1, result.get("passwordReset"));
        assertEquals("123456", result.get("defaultPassword"));
        assertTrue(BCrypt.checkpw("123456", existingUser.getPassword()));
        assertEquals("registered", existingRoster.getStatus());
        assertEquals("registered", missingRoster.getStatus());
        verify(userService).save(argThat(user ->
                "202408384101".equals(user.getUsername())
                        && "陈冬妮".equals(user.getRealName())
                        && "active".equals(user.getStatus())
                        && BCrypt.checkpw("123456", user.getPassword())));
        verify(rosterService, times(2)).updateById(any(StudentRoster.class));
    }

    private StudentRoster roster(String studentNo, String realName) {
        StudentRoster roster = new StudentRoster();
        roster.setStudentNo(studentNo);
        roster.setRealName(realName);
        roster.setCollege("计算机与人工智能学院");
        roster.setMajorId(1L);
        roster.setClassId(2L);
        roster.setGrade("2024");
        roster.setStatus("pending");
        return roster;
    }
}
