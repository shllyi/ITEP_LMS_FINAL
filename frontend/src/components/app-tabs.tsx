import React from 'react';
import { NativeTabs } from 'expo-router/native-tabs';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';

export default function AppTabs() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return (
      <NativeTabs
        backgroundColor={COLORS.white}
        indicatorColor={COLORS.primary}
        labelStyle={{ selected: { color: COLORS.primary } }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/home.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        {user?.role === 'program chair' || user?.role === 'program_chair' || user?.role === 'admin' ? (
          <>
            <NativeTabs.Trigger name="profile">
              <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                src={require('@/assets/images/tabIcons/explore.png')}
                renderingMode="template"
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="chair">
              <NativeTabs.Trigger.Label>Chair Portal</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                src={require('@/assets/images/tabIcons/explore.png')}
                renderingMode="template"
              />
            </NativeTabs.Trigger>
          </>
        ) : user?.role === 'faculty' ? (
          <>
            <NativeTabs.Trigger name="profile">
              <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                src={require('@/assets/images/tabIcons/explore.png')}
                renderingMode="template"
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="faculty">
              <NativeTabs.Trigger.Label>Faculty Dashboard</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                src={require('@/assets/images/tabIcons/explore.png')}
                renderingMode="template"
              />
            </NativeTabs.Trigger>
          </>
        ) : (
          <>
            <NativeTabs.Trigger name="profile">
              <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                src={require('@/assets/images/tabIcons/explore.png')}
                renderingMode="template"
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="student">
              <NativeTabs.Trigger.Label>Student Dashboard</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                src={require('@/assets/images/tabIcons/explore.png')}
                renderingMode="template"
              />
            </NativeTabs.Trigger>
          </>
        )}
      </NativeTabs>
    );
  }

  return (
    <NativeTabs
      backgroundColor={COLORS.white}
      indicatorColor={COLORS.primary}
      labelStyle={{ selected: { color: COLORS.primary } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="login">
        <NativeTabs.Trigger.Label>Sign In</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="register">
        <NativeTabs.Trigger.Label>Get Started</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
