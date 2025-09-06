// hooks/useStepCounter.js
import { useState, useEffect } from "react";
import { Pedometer } from "expo-sensors";

export const useStepCounter = (weightKg = 70) => {
  const [data, setData] = useState({ steps: 0, calories: 0 });

  useEffect(() => {
    let subscription = null;

    Pedometer.isAvailableAsync()
      .then((available) => {
        if (available) {
          subscription = Pedometer.watchStepCount((result) => {
            const steps = result?.steps ?? 0;
            const calories = steps * weightKg * 0.04;
            setData({ steps, calories });
          });
        } else {
          console.warn("Pedometer not available on this device");
        }
      })
      .catch((err) => console.warn("Pedometer.isAvailableAsync error", err));

    return () => {
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      } else if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, [weightKg]);

  return data;
};
