import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import ResumeScreen from "../screens/ResumeScreen";
import SessionPickerScreen from "../screens/SessionPickerScreen";
import MockInterviewScreen from "../screens/MockInterviewScreen";
import InterviewScreen from "../screens/InterviewScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Resume" component={ResumeScreen} />
        <Stack.Screen name="SessionPicker" component={SessionPickerScreen} />
        <Stack.Screen name="MockInterview" component={MockInterviewScreen} />
        <Stack.Screen name="Interview" component={InterviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}