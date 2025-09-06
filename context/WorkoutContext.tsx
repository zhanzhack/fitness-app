import React, { createContext, useState, ReactNode } from "react";

export type Workout = {
  id: string;
  name: string;
  duration?: number;
};

type WorkoutContextType = {
  workouts: Workout[];
  addWorkout: (w: Workout) => void;
};

export const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const addWorkout = (w: Workout) => setWorkouts((prev) => [...prev, w]);

  return <WorkoutContext.Provider value={{ workouts, addWorkout }}>{children}</WorkoutContext.Provider>;
};
