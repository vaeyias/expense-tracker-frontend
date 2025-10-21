# HomeView.vue
## Overview
HomeView.vue serves as the main dashboard for the user, displaying a grid of folders and groups. It allows users to create, rename, delete, and navigate between folders, as well as create new groups within those folders.

## Layout
- side bar with two buttons: Create Folder and Create Group
- a main section with a grid of Folders then a grid of Groups under it
- when a user clicks a folder icon, the main grid reloads with a grid of subfolders ang groups inside that folder
- there is a bar at the top that has a back button to return to the parent folder, shows the folder name, and  has a rename and delete folder button (these buttons only appears if the folder we are viewing is not ".root" folder).

## Core Functionalities
### Folder Management
- Create folders at the root level or inside other folders depending on which folder the user is currently viewing
- when the user is not looking at the ".root" folder, they can rename or delete a folder
- users can Navigate between folders (open subfolders or go back to the parent)
- Create new groups in the current folder
- Display existing groups that are part of the current folder fetched from the backend
- Navigate to a specific group page (/group:groupId) by clicking on a group
