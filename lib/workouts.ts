
import { supabase } from "./supabase";

// получение всех тренировок
export async function fetchWorkouts(userId?: string, guestId?: string) {
  let query = supabase.from("workouts").select("*").order("created_at", { ascending: false });

  if (userId) {
    query = query.or(`user_id.eq.${userId},guest_id.eq.${guestId}`);
  } else if (guestId) {
    query = query.eq("guest_id", guestId);
  }

  const { data, error } = await query;
  if (error) console.log(error);
  return data;
}

// Добавление новой тренировки
export async function addWorkout(workout: any) {
  const { data, error } = await supabase.from("workouts").insert([workout]);
  if (error) console.log(error);
  return data;
}

// Слияние тренировок гостя с аккаунтом
export async function mergeGuestWorkouts(userId: string, guestId: string) {
  const { data, error } = await supabase
    .from("workouts")
    .update({ user_id: userId, guest_id: null })
    .eq("guest_id", guestId);

  if (error) console.log("Error merging workouts:", error);
  return data;
}
