# Project Structure Map
This is a React Maintenance App using Vite and Tailwind.

1. src/App.jsx
   - The Brain / Controller.
   - Holds the main state (sites, assets, active tab).
   - Handles data loading and saving.
   - Contains the Main Schedule Table.

2. src/components/UIComponents.jsx
   - The Look / Visuals.
   - Contains: Icons, Cards, Buttons, Charts, Calendar, Badges.
   - Edit this to change colors, fonts, or shapes.

3. src/components/MasterListModal.jsx
   - The "Master List" popup.
   - Contains its own search and sort logic.

4. src/components/AssetModals.jsx
   - The "Add Asset" and "Edit Asset" popups.

5. src/components/SiteModals.jsx
   - The "Add Site", "Edit Site", and "Contact Info" popups.

6. src/data/mockData.js
   - The Ingredients.
   - Contains the static/test data and generator functions.