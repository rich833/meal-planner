document.addEventListener('DOMContentLoaded', () => {
    let meals = JSON.parse(localStorage.getItem('meals')) || [];
    const mealForm = document.getElementById('meal-form');
    const mealsList = document.getElementById('meals-list');
    const shoppingList = document.getElementById('list');
    const generateListButton = document.getElementById('generate-list');
    const filterTypeSelect = document.getElementById('filter-type');
    const searchNameInput = document.getElementById('search-name');
    let editMode = false;
    let editId = null;
    let currentMealId;

    mealForm.addEventListener('submit', (event) => {
        console.log("add meal");
        event.preventDefault();
        const name = document.getElementById('meal-name').value.trim();
        const type = document.getElementById('meal-type').value;
        // Split ingredients by newline or comma
        let ingredients = document.getElementById('meal-ingredients').value.split(/[\n,]+/).map(ingredient => ingredient.trim()).filter(ingredient => ingredient);
        console.log("got here");
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

    function confirmIngredients(name, type) {
        let updatedIngredients = [];
        const ingredientsElements = document.querySelectorAll('.ingredient-item');
    
        ingredientsElements.forEach((item, index) => {
            const baseIngredient = item.querySelector('.ingredient-name').textContent;
            const isOptional = document.getElementById(`optional-${index}`).checked;
            const variants = document.getElementById(`variant-${index}`).value.split(',').map(v => v.trim()).filter(v => v);
    
            // Add the ingredient with its variants
            updatedIngredients.push({ 
                name: baseIngredient, 
                optional: isOptional, 
                variants: variants 
            });
        });
    
        saveMealData(updatedIngredients, name, type);
    }


    function saveMealData(ingredients, name, type) {
        const mealData = {
            id: editMode ? editId : new Date().getTime(),
            name,
            type,
            ingredients,
            selected: false,
            selectedOptions: []
        };

        if (editMode) {
            const mealIndex = meals.findIndex(meal => meal.id === editId);
            meals[mealIndex] = mealData;
        } else {
            meals.push(mealData);
        }

        localStorage.setItem('meals', JSON.stringify(meals));
        renderMeals();
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
                    <button class="edit-button" onclick="editMeal(${meal.id})">&#9998;</button> <!-- Edit button -->
                    <button class="delete-button" onclick="deleteMeal(${meal.id})">&#10060;</button>
                `;
    
                mealsList.appendChild(mealElement);
            });
    }
    
    window.editMeal = function(mealId) {
        const mealToEdit = meals.find(meal => meal.id === mealId);
        if (mealToEdit) {
            // Populate the meal form fields with the data of the meal to be edited
            document.getElementById('meal-name').value = mealToEdit.name;
            document.getElementById('meal-type').value = mealToEdit.type;
            document.getElementById('meal-ingredients').value = mealToEdit.ingredients.map(ing => ing.name).join('\n'); // Assuming ingredients are stored as an array of objects
    
            // Set up the application state or variables to indicate that you're in edit mode
            editMode = true;
            editId = mealId;
    
            // Optionally, adjust UI elements to reflect that the user is editing an existing meal
        }
    }
    

    window.toggleMealSelection = function(mealId) {
        const mealIndex = meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            meals[mealIndex].selected = !meals[mealIndex].selected;
            localStorage.setItem('meals', JSON.stringify(meals));
            if (meals[mealIndex].selected) {
                showMealSelectionModal(meals[mealIndex]);
            } else {
                // Deselect and remove options from the shopping list
                meals[mealIndex].selectedOptions = [];
            }
            renderMeals();
        }
    };    

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
                checkbox.checked = meal.selectedOptions.includes(ingredient.name);
                checkbox.onchange = () => toggleOptionalIngredient(meal.id, ingredient.name);
                label.appendChild(checkbox);
            }
    
            if (ingredient.variants.length > 0) {
                ingredient.variants.forEach(variant => {
                    const variantCheckbox = document.createElement('input');
                    variantCheckbox.type = 'checkbox';
                    variantCheckbox.id = `variant-${meal.id}-${index}-${variant}`;
                    variantCheckbox.checked = meal.selectedOptions.includes(`${variant} ${ingredient.name}`);
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

    function toggleVariantOption(mealId, variantName) {
        const mealIndex = meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            const selectedOptions = meals[mealIndex].selectedOptions;
            const optionIndex = selectedOptions.indexOf(variantName);
            if (optionIndex > -1) {
                selectedOptions.splice(optionIndex, 1); // Remove the variant from selected options
            } else {
                selectedOptions.push(variantName); // Add the variant to selected options
            }
            localStorage.setItem('meals', JSON.stringify(meals));
        }
    }
    
    document.getElementById('save-ingredients').addEventListener('click', () => {
        saveSelectedIngredients(currentMealId);
    });

    function saveSelectedIngredients(mealId) {
        const mealIndex = meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            const meal = meals[mealIndex];
            meal.selectedOptions = [];
    
            for (let index = 0; index < meal.ingredients.length; index++) {
                const ingredient = meal.ingredients[index];
                let variantSelected = false;
    
                for (let variantIndex = 0; variantIndex < ingredient.variants.length; variantIndex++) {
                    const variant = ingredient.variants[variantIndex];
                    const variantCheckboxId = `variant-${meal.id}-${index}-${variant}`;
                    if (document.getElementById(variantCheckboxId) && document.getElementById(variantCheckboxId).checked) {
                        meal.selectedOptions.push(`${variant} ${ingredient.name}`);
                        variantSelected = true;
                    }
                }
    
                if (!variantSelected) {
                    const optionalCheckboxId = `optional-ingredient-${index}`;
                    const optionalCheckbox = document.getElementById(optionalCheckboxId);
                    if (!ingredient.optional || (optionalCheckbox && optionalCheckbox.checked)) {
                        meal.selectedOptions.push(ingredient.name);
                    }
                }
            }
    
            localStorage.setItem('meals', JSON.stringify(meals));
            // Close the modal and update the UI as needed
            closeModal();
        }
    }
    
    
    
    
    function toggleOptionalIngredient(mealId, ingredientName) {
        const mealIndex = meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            const selectedOptions = meals[mealIndex].selectedOptions;
            const optionIndex = selectedOptions.indexOf(ingredientName);
            if (optionIndex > -1) {
                selectedOptions.splice(optionIndex, 1);
            } else {
                selectedOptions.push(ingredientName);
            }
            localStorage.setItem('meals', JSON.stringify(meals));
        }
    }

    window.closeModal = function() {
        document.getElementById('ingredient-modal').style.display = 'none';
        document.getElementById('meal-selection-modal').style.display = 'none';
        document.getElementById('meal-selection-modal').style.display = 'none';
    }

    window.deleteMeal = function (mealId) {
        meals = meals.filter(m => m.id !== mealId);
        localStorage.setItem('meals', JSON.stringify(meals));
        renderMeals();
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
            meal.selectedOptions.forEach(option => {
                // Add each selected option (base ingredient or variant) to the set
                ingredients.add(option);
            });
        });
    
        // Now populate the shopping list UI
        shoppingList.innerHTML = '';
        ingredients.forEach(ingredient => {
            const listItem = document.createElement('li');
            listItem.textContent = ingredient;
            shoppingList.appendChild(listItem);
        });
    }
    

    renderMeals();
});
