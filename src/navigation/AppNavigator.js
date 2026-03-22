import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import ResumeScreen from "../screens/ResumeScreen";
import SessionPickerScreen from "../screens/SessionPickerScreen";
import MockInterviewListScreen from "../screens/MockInterviewListScreen";
import MockInterviewScreen from "../screens/MockInterviewScreen";
import MockInterviewResultScreen from "../screens/MockInterviewResultScreen";
import InterviewScreen from "../screens/InterviewScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Resume" component={ResumeScreen} />
        <Stack.Screen name="SessionPicker" component={SessionPickerScreen} />
        <Stack.Screen
          name="MockInterviewList"
          component={MockInterviewListScreen}
          options={{ title: "Mock Interviews" }}
        />
        <Stack.Screen
          name="MockInterviewSession"
          component={MockInterviewScreen}
          options={{ title: "Mock Interview" }}
        />
        <Stack.Screen
          name="MockInterviewResult"
          component={MockInterviewResultScreen}
          options={{ title: "Results" }}
        />
        <Stack.Screen name="MockInterview" component={MockInterviewScreen} />
        <Stack.Screen name="Interview" component={InterviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}