import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchWorkouts } from "../lib/workouts";
import { getGuestId } from "../lib/guest";

export function useLastWorkouts(localWorkouts: any[]) {
  const [userId, setUserId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [lastWorkouts, setLastWorkouts] = useState<any[]>([]);

  // Инициализация user_id и guest_id
  useEffect(() => {
    const initIds = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const gId = await getGuestId();
      setGuestId(gId);
    };
    initIds();
  }, []);

  // Загрузка последних 3 тренировок
  const loadLastWorkouts = async () => {
    if (!userId && !guestId) return;
    const data = await fetchWorkouts(userId ?? undefined, guestId ?? undefined);
    if (!data) return;

    const sorted = data
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map(w => ({
        type: w.type,
        distance: w.distance,
        created_at: w.created_at,
      }));

    setLastWorkouts(sorted);
  };

  useEffect(() => {
    loadLastWorkouts();
  }, [userId, guestId, localWorkouts]);

  return { lastWorkouts, loadLastWorkouts };
}
