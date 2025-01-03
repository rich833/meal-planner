// script.js
import { dbOperations } from './db.js';

class MealPlanner {
    constructor() {
        this.meals = [];
        this.editMode = false;
        this.editId = null;
        this.currentMealId = null;
        this.initElements();
        this.attachEventListeners();
        this.loadMeals();
    }

    initElements() {
        // Forms and lists
        this.mealForm = document.getElementById('meal-form');
        this.mealsList = document.getElementById('meals-list');
        this.shoppingList = document.getElementById('list');
        
        // Buttons and inputs
        this.generateListButton = document.getElementById('generate-list');
        this.filterTypeSelect = document.getElementById('filter-type');
        this.searchNameInput = document.getElementById('search-name');
        
        // Modals
        this.ingredientModal = document.getElementById('ingredient-modal');
        this.mealSelectionModal = document.getElementById('meal-selection-modal');
        
        // Modal elements
        this.modalIngredients = document.getElementById('modal-ingredients');
        this.confirmIngredientsBtn = document.getElementById('confirm-ingredients');
        this.saveIngredientsBtn = document.getElementById('save-ingredients');
        this.mealSelectionModalContent = document.getElementById('meal-selection-modal-content');
    }

    attachEventListeners() {
        // Form submissions
        this.mealForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMealSubmit();
        });

        // Modal actions
        this.confirmIngredientsBtn.addEventListener('click', () => this.confirmIngredients());
        this.saveIngredientsBtn.addEventListener('click', () => this.saveSelectedIngredients());
        
        // Close buttons
        document.querySelectorAll('.close-button').forEach(button => {
            button.addEventListener('click', () => this.closeModals());
        });

        // Filter and search
        this.filterTypeSelect.addEventListener('change', () => this.filterMeals());
        this.searchNameInput.addEventListener('input', () => this.filterMeals());
        
        // Generate list
        this.generateListButton.addEventListener('click', () => this.generateShoppingList());
    }

    async loadMeals() {
        try {
            this.meals = await dbOperations.fetchMeals();
            this.renderMeals();
        } catch (error) {
            console.error('Error loading meals:', error);
        }
    }

    handleMealSubmit() {
        const name = document.getElementById('meal-name').value.trim();
        const type = document.getElementById('meal-type').value;
        const ingredients = document.getElementById('meal-ingredients').value
            .split(/[\n,]+/)
            .map(ingredient => ingredient.trim())
            .filter(ingredient => ingredient);
        
        this.showIngredientModal(ingredients, name, type);
    }

    showIngredientModal(ingredients, name, type) {
        this.modalIngredients.innerHTML = ingredients.map((ingredient, index) => `
            <div class="ingredient-item">
                <span class="ingredient-name">${ingredient}</span>
                <label class="optional-label">
                    <input type="checkbox" id="optional-${index}"> Optional
                </label>
                <button class="add-variant-btn" data-index="${index}">Add Variant</button>
                <input type="text" id="variant-${index}" class="variant-input" 
                       placeholder="Enter variants (comma-separated)" style="display: none;">
            </div>
        `).join('');

        // Add variant button listeners
        this.modalIngredients.querySelectorAll('.add-variant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const variantInput = document.getElementById(`variant-${btn.dataset.index}`);
                variantInput.style.display = 'block';
            });
        });

        this.ingredientModal.style.display = 'block';
    }

    async confirmIngredients() {
        const name = document.getElementById('meal-name').value.trim();
        const type = document.getElementById('meal-type').value;
        const ingredients = Array.from(this.modalIngredients.querySelectorAll('.ingredient-item'))
            .map(item => ({
                name: item.querySelector('.ingredient-name').textContent,
                optional: item.querySelector('input[type="checkbox"]').checked,
                variants: item.querySelector('.variant-input').value
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v)
            }));

        const mealData = {
            name,
            type,
            ingredients,
            selected: false,
            selected_options: []
        };

        try {
            if (this.editMode) {
                await dbOperations.updateMeal(this.editId, mealData);
            } else {
                await dbOperations.insertMeal(mealData);
            }
            
            await this.loadMeals();
            this.mealForm.reset();
            this.closeModals();
            this.editMode = false;
            this.editId = null;
        } catch (error) {
            console.error('Error saving meal:', error);
        }
    }

    renderMeals(filterType = 'All', searchName = '') {
        this.mealsList.innerHTML = '';
        this.meals
            .filter(meal => filterType === 'All' || meal.type === filterType)
            .filter(meal => meal.name.toLowerCase().includes(searchName.toLowerCase()))
            .forEach(meal => {
                const mealElement = document.createElement('div');
                mealElement.className = 'meal-item';
                mealElement.innerHTML = `
                    <input type="checkbox" class="meal-checkbox" data-id="${meal.id}" 
                           ${meal.selected ? 'checked' : ''}>
                    <span class="meal-name">${meal.name} (${meal.type})</span>
                    <button class="edit-button" data-id="${meal.id}">✎</button>
                    <button class="delete-button" data-id="${meal.id}">✖</button>
                `;

                // Add event listeners
                const checkbox = mealElement.querySelector('.meal-checkbox');
                const editBtn = mealElement.querySelector('.edit-button');
                const deleteBtn = mealElement.querySelector('.delete-button');

                checkbox.addEventListener('change', () => this.toggleMealSelection(meal.id));
                editBtn.addEventListener('click', () => this.editMeal(meal.id));
                deleteBtn.addEventListener('click', () => this.deleteMeal(meal.id));

                this.mealsList.appendChild(mealElement);
            });
    }

    filterMeals() {
        const filterType = this.filterTypeSelect.value;
        const searchName = this.searchNameInput.value.trim();
        this.renderMeals(filterType, searchName);
    }

    async toggleMealSelection(mealId) {
        const meal = this.meals.find(m => m.id === mealId);
        if (!meal) return;

        try {
            const newSelected = !meal.selected;
            await dbOperations.updateMealSelection(mealId, newSelected);
            
            if (newSelected) {
                this.showMealSelectionModal(meal);
            }
            
            await this.loadMeals();
        } catch (error) {
            console.error('Error toggling meal selection:', error);
        }
    }

    generateShoppingList() {
        const selectedMeals = this.meals.filter(m => m.selected);
        const ingredients = new Set();
        
        selectedMeals.forEach(meal => {
            meal.selected_options.forEach(option => {
                ingredients.add(option);
            });
        });
    
        this.shoppingList.innerHTML = Array.from(ingredients)
            .map(ingredient => `<li>${ingredient}</li>`)
            .join('');
    }

    closeModals() {
        this.ingredientModal.style.display = 'none';
        this.mealSelectionModal.style.display = 'none';
    }

    async editMeal(mealId) {
        const meal = this.meals.find(m => m.id === mealId);
        if (!meal) return;

        this.editMode = true;
        this.editId = mealId;
        
        document.getElementById('meal-name').value = meal.name;
        document.getElementById('meal-type').value = meal.type;
        document.getElementById('meal-ingredients').value = 
            meal.ingredients.map(ing => ing.name).join('\n');
        
        this.showIngredientModal(
            meal.ingredients.map(ing => ing.name),
            meal.name,
            meal.type
        );
    }

    async deleteMeal(mealId) {
        try {
            await dbOperations.deleteMeal(mealId);
            await this.loadMeals();
        } catch (error) {
            console.error('Error deleting meal:', error);
        }
    }

    showMealSelectionModal(meal) {
        this.currentMealId = meal.id;
        this.mealSelectionModalContent.innerHTML = '';
    
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
                checkbox.addEventListener('change', () => this.toggleOptionalIngredient(meal.id, ingredient.name));
                label.appendChild(checkbox);
            }
    
            if (ingredient.variants && ingredient.variants.length > 0) {
                ingredient.variants.forEach(variant => {
                    const variantDiv = document.createElement('div');
                    variantDiv.className = 'variant-option';
                    
                    const variantCheckbox = document.createElement('input');
                    variantCheckbox.type = 'checkbox';
                    variantCheckbox.id = `variant-${meal.id}-${index}-${variant}`;
                    variantCheckbox.checked = meal.selected_options.includes(`${variant} ${ingredient.name}`);
                    
                    const variantLabel = document.createElement('label');
                    variantLabel.textContent = variant;
                    variantLabel.insertBefore(variantCheckbox, variantLabel.firstChild);
                    
                    variantCheckbox.addEventListener('change', () => 
                        this.toggleVariantOption(meal.id, `${variant} ${ingredient.name}`)
                    );
                    
                    variantDiv.appendChild(variantLabel);
                    div.appendChild(variantDiv);
                });
            }
    
            this.mealSelectionModalContent.appendChild(div);
        });
    
        this.mealSelectionModal.style.display = 'block';
    }

    async toggleOptionalIngredient(mealId, ingredientName) {
        const meal = this.meals.find(m => m.id === mealId);
        if (!meal) return;

        const selected_options = [...meal.selected_options];
        const optionIndex = selected_options.indexOf(ingredientName);
        
        if (optionIndex > -1) {
            selected_options.splice(optionIndex, 1);
        } else {
            selected_options.push(ingredientName);
        }

        try {
            await dbOperations.updateMealSelection(mealId, meal.selected, selected_options);
            await this.loadMeals();
        } catch (error) {
            console.error('Error updating optional ingredients:', error);
        }
    }

    async toggleVariantOption(mealId, variantName) {
        const meal = this.meals.find(m => m.id === mealId);
        if (!meal) return;

        const selected_options = [...meal.selected_options];
        const optionIndex = selected_options.indexOf(variantName);
        
        if (optionIndex > -1) {
            selected_options.splice(optionIndex, 1);
        } else {
            selected_options.push(variantName);
        }

        try {
            await dbOperations.updateMealSelection(mealId, meal.selected, selected_options);
            await this.loadMeals();
        } catch (error) {
            console.error('Error updating variant options:', error);
        }
    }

    saveSelectedIngredients() {
        const meal = this.meals.find(m => m.id === this.currentMealId);
        if (!meal) return;

        let selected_options = [];
        
        meal.ingredients.forEach((ingredient, index) => {
            let variantSelected = false;

            if (ingredient.variants) {
                ingredient.variants.forEach(variant => {
                    const variantCheckboxId = `variant-${meal.id}-${index}-${variant}`;
                    const checkbox = document.getElementById(variantCheckboxId);
                    if (checkbox && checkbox.checked) {
                        selected_options.push(`${variant} ${ingredient.name}`);
                        variantSelected = true;
                    }
                });
            }

            if (!variantSelected) {
                const optionalCheckboxId = `optional-ingredient-${index}`;
                const optionalCheckbox = document.getElementById(optionalCheckboxId);
                if (!ingredient.optional || (optionalCheckbox && optionalCheckbox.checked)) {
                    selected_options.push(ingredient.name);
                }
            }
        });

        dbOperations.updateMealSelection(this.currentMealId, true, selected_options)
            .then(() => this.loadMeals())
            .then(() => this.closeModals())
            .catch(error => console.error('Error saving selected ingredients:', error));
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MealPlanner();
});