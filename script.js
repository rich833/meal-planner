import { supabase } from './db.js'

document.addEventListener('DOMContentLoaded', async () => {
    let meals = [];
    const mealForm = document.getElementById('meal-form');
    const mealsList = document.getElementById('meals-list');
    const shoppingList = document.getElementById('list');
    const generateListButton = document.getElementById('generate-list');
    const filterTypeSelect = document.getElementById('filter-type');
    const searchNameInput = document.getElementById('search-name');
    let editMode = false;
    let editId = null;
    let currentMealId;

    // Fetch initial meals
    async function fetchMeals() {
        const { data, error } = await supabase
            .from('meals')
            .select('*');
        
        if (error) {
            console.error('Error fetching meals:', error);
            return;
        }
        
        meals = data;
        renderMeals();
    }

    // Initial load
    await fetchMeals();

    mealForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = document.getElementById('meal-name').value.trim();
        const type = document.getElementById('meal-type').value;
        let ingredients = document.getElementById('meal-ingredients').value
            .split(/[\n,]+/)
            .map(ingredient => ingredient.trim())
            .filter(ingredient => ingredient);
        
        showIngredientModal(ingredients, name, type);
    });

    document.getElementById('confirm-ingredients').addEventListener('click', () => {
        const name = document.getElementById('meal-name').value.trim();
        const type = document.getElementById('meal-type').value;
        confirmIngredients(name, type);
    });

    function showIngredientModal(ingredients, name, type) {
        const modalIngredients = document.getElementById('modal-ingredients');
        modalIngredients.innerHTML = ingredients.map((ingredient, index) => 
            `<div class="ingredient-item">
                <span class="ingredient-name">${ingredient}</span>
                <label class="optional-label">
                    <input type="checkbox" id="optional-${index}"> Optional
                </label>
                <a href="#" class="add-variant-link" onclick="showVariantInput(${index})">Add Variant</a>
                <input type="text" id="variant-${index}" class="variant-input" placeholder="Enter variants (comma-separated)" style="display: none;">
            </div>`
        ).join('');
    
        document.getElementById('ingredient-modal').style.display = "block";
    }

    window.showVariantInput = function(index) {
        const variantInput = document.getElementById(`variant-${index}`);
        variantInput.style.display = 'block';
    };

    async function confirmIngredients(name, type) {
        let updatedIngredients = [];
        const ingredientsElements = document.querySelectorAll('.ingredient-item');
    
        ingredientsElements.forEach((item, index) => {
            const baseIngredient = item.querySelector('.ingredient-name').textContent;
            const isOptional = document.getElementById(`optional-${index}`).checked;
            const variants = document.getElementById(`variant-${index}`).value.split(',').map(v => v.trim()).filter(v => v);
    
            updatedIngredients.push({ 
                name: baseIngredient, 
                optional: isOptional, 
                variants: variants 
            });
        });
    
        await saveMealData(updatedIngredients, name, type);
    }

    async function saveMealData(ingredients, name, type) {
        const mealData = {
            name,
            type,
            ingredients,
            selected: false,
            selected_options: []
        };

        if (editMode) {
            const { error } = await supabase
                .from('meals')
                .update(mealData)
                .eq('id', editId);

            if (error) {
                console.error('Error updating meal:', error);
                return;
            }
        } else {
            const { error } = await supabase
                .from('meals')
                .insert([mealData]);

            if (error) {
                console.error('Error inserting meal:', error);
                return;
            }
        }

        await fetchMeals();
        mealForm.reset();
        closeModal();
    }

    function renderMeals(filterType = 'All', searchName = '') {
        mealsList.innerHTML = '';
        meals
            .filter(meal => filterType === 'All' || meal.type === filterType)
            .filter(meal => meal.name.toLowerCase().includes(searchName.toLowerCase()))
            .forEach(meal => {
                const mealElement = document.createElement('div');
                mealElement.className = 'meal-item';
    
                mealElement.innerHTML = `
                    <input type="checkbox" id="meal-${meal.id}" ${meal.selected ? 'checked' : ''} onchange="toggleMealSelection(${meal.id})">
                    <label for="meal-${meal.id}" class="meal-name">${meal.name} (${meal.type})</label>
                    <button class="edit-button" onclick="editMeal(${meal.id})">&#9998;</button>
                    <button class="delete-button" onclick="deleteMeal(${meal.id})">&#10060;</button>
                `;
    
                mealsList.appendChild(mealElement);
            });
    }

    window.editMeal = function(mealId) {
        const mealToEdit = meals.find(meal => meal.id === mealId);
        if (mealToEdit) {
            document.getElementById('meal-name').value = mealToEdit.name;
            document.getElementById('meal-type').value = mealToEdit.type;
            document.getElementById('meal-ingredients').value = mealToEdit.ingredients.map(ing => ing.name).join('\n');
            
            editMode = true;
            editId = mealId;
        }
    }

    window.toggleMealSelection = async function(mealId) {
        const mealIndex = meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            const newSelected = !meals[mealIndex].selected;
            
            const { error } = await supabase
                .from('meals')
                .update({ selected: newSelected })
                .eq('id', mealId);

            if (error) {
                console.error('Error updating meal selection:', error);
                return;
            }

            if (newSelected) {
                showMealSelectionModal(meals[mealIndex]);
            } else {
                const { error: updateError } = await supabase
                    .from('meals')
                    .update({ selected_options: [] })
                    .eq('id', mealId);

                if (updateError) {
                    console.error('Error clearing selected options:', updateError);
                }
            }
            await fetchMeals();
        }
    }

    function showMealSelectionModal(meal) {
        currentMealId = meal.id; 
        const modalContent = document.getElementById('meal-selection-modal-content');
        modalContent.innerHTML = '';
    
        meal.ingredients.forEach((ingredient, index) => {
            const div = document.createElement('div');
            div.className = 'ingredient-option';
    
            const label = document.createElement('label');
            label.textContent = ingredient.name;
            div.appendChild(label);
    
            if (ingredient.optional) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `optional-ingredient-${index}`;
                checkbox.checked = meal.selected_options.includes(ingredient.name);
                checkbox.onchange = () => toggleOptionalIngredient(meal.id, ingredient.name);
                label.appendChild(checkbox);
            }
    
            if (ingredient.variants.length > 0) {
                ingredient.variants.forEach(variant => {
                    const variantCheckbox = document.createElement('input');
                    variantCheckbox.type = 'checkbox';
                    variantCheckbox.id = `variant-${meal.id}-${index}-${variant}`;
                    variantCheckbox.checked = meal.selected_options.includes(`${variant} ${ingredient.name}`);
                    variantCheckbox.onchange = () => toggleVariantOption(meal.id, `${variant} ${ingredient.name}`);
                    const variantLabel = document.createElement('label');
                    variantLabel.textContent = variant;
                    variantLabel.insertBefore(variantCheckbox, variantLabel.firstChild);
                    div.appendChild(variantLabel);
                });
            }
    
            modalContent.appendChild(div);
        });
    
        document.getElementById('meal-selection-modal').style.display = 'block';
    }

    async function toggleVariantOption(mealId, variantName) {
        const mealIndex = meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            const meal = meals[mealIndex];
            const selected_options = [...meal.selected_options];
            const optionIndex = selected_options.indexOf(variantName);
            
            if (optionIndex > -1) {
                selected_options.splice(optionIndex, 1);
            } else {
                selected_options.push(variantName);
            }

            const { error } = await supabase
                .from('meals')
                .update({ selected_options })
                .eq('id', mealId);

            if (error) {
                console.error('Error updating variant options:', error);
                return;
            }

            await fetchMeals();
        }
    }

    document.getElementById('save-ingredients').addEventListener('click', () => {
        saveSelectedIngredients(currentMealId);
    });

    async function saveSelectedIngredients(mealId) {
        const mealIndex = meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            const meal = meals[mealIndex];
            let selected_options = [];
    
            for (let index = 0; index < meal.ingredients.length; index++) {
                const ingredient = meal.ingredients[index];
                let variantSelected = false;
    
                for (let variantIndex = 0; variantIndex < ingredient.variants.length; variantIndex++) {
                    const variant = ingredient.variants[variantIndex];
                    const variantCheckboxId = `variant-${meal.id}-${index}-${variant}`;
                    if (document.getElementById(variantCheckboxId) && document.getElementById(variantCheckboxId).checked) {
                        selected_options.push(`${variant} ${ingredient.name}`);
                        variantSelected = true;
                    }
                }
    
                if (!variantSelected) {
                    const optionalCheckboxId = `optional-ingredient-${index}`;
                    const optionalCheckbox = document.getElementById(optionalCheckboxId);
                    if (!ingredient.optional || (optionalCheckbox && optionalCheckbox.checked)) {
                        selected_options.push(ingredient.name);
                    }
                }
            }
    
            const { error } = await supabase
                .from('meals')
                .update({ selected_options })
                .eq('id', mealId);

            if (error) {
                console.error('Error updating selected options:', error);
                return;
            }
    
            await fetchMeals();
            closeModal();
        }
    }

    async function toggleOptionalIngredient(mealId, ingredientName) {
        const mealIndex = meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            const meal = meals[mealIndex];
            const selected_options = [...meal.selected_options];
            const optionIndex = selected_options.indexOf(ingredientName);
            
            if (optionIndex > -1) {
                selected_options.splice(optionIndex, 1);
            } else {
                selected_options.push(ingredientName);
            }

            const { error } = await supabase
                .from('meals')
                .update({ selected_options })
                .eq('id', mealId);

            if (error) {
                console.error('Error updating optional ingredients:', error);
                return;
            }

            await fetchMeals();
        }
    }

    window.closeModal = function() {
        document.getElementById('ingredient-modal').style.display = 'none';
        document.getElementById('meal-selection-modal').style.display = 'none';
    }

    window.deleteMeal = async function(mealId) {
        const { error } = await supabase
            .from('meals')
            .delete()
            .eq('id', mealId);

        if (error) {
            console.error('Error deleting meal:', error);
            return;
        }

        await fetchMeals();
    }

    filterTypeSelect.addEventListener('change', () => {
        const filterType = filterTypeSelect.value;
        const searchName = searchNameInput.value.trim().toLowerCase();
        renderMeals(filterType, searchName);
    });

    searchNameInput.addEventListener('input', () => {
        const filterType = filterTypeSelect.value;
        const searchName = searchNameInput.value.trim().toLowerCase();
        renderMeals(filterType, searchName);
    });

    generateListButton.addEventListener('click', () => {
        const selectedMeals = meals.filter(m => m.selected);
        generateShoppingList(selectedMeals);
    });

    function generateShoppingList(selectedMeals) {
        const ingredients = new Set();
        
        selectedMeals.forEach(meal => {
            meal.selected_options.forEach(option => {
                ingredients.add(option);
            });
        });
    
        shoppingList.innerHTML = '';
        ingredients.forEach(ingredient => {
            const listItem = document.createElement('li');
            listItem.textContent = ingredient;
            shoppingList.appendChild(listItem);
        });
    }

    // Initial render
    renderMeals();
});