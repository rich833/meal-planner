// db.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database operations
export const dbOperations = {
    async fetchMeals() {
        const { data, error } = await supabase
            .from('meals')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    },

    async insertMeal(mealData) {
        const { data, error } = await supabase
            .from('meals')
            .insert([mealData])
            .select();
            
        if (error) throw error;
        return data[0];
    },

    async updateMeal(id, mealData) {
        const { data, error } = await supabase
            .from('meals')
            .update(mealData)
            .eq('id', id)
            .select();
            
        if (error) throw error;
        return data[0];
    },

    async deleteMeal(id) {
        const { error } = await supabase
            .from('meals')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    },

    async updateMealSelection(id, selected, selectedOptions = []) {
        const { error } = await supabase
            .from('meals')
            .update({ 
                selected, 
                selected_options: selectedOptions 
            })
            .eq('id', id);
            
        if (error) throw error;
    }
};