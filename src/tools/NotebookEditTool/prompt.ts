export const DESCRIPTION =
  'Edit cells in a Jupyter notebook after reading the notebook.'
export const PROMPT = `Edit a Jupyter notebook (.ipynb file) cell.

Before using this tool, read the target notebook with the Read tool in this session. Use the cell IDs exactly as shown in the Read output, for example <cell id="cell-0"> means cell_id must be "cell-0" rather than "0".

Parameters:
- notebook_path must be an absolute path.
- cell_id is required for edit_mode=replace or edit_mode=delete. For edit_mode=insert, omit cell_id to insert at the beginning, or provide a real existing cell_id to insert after that cell.
- new_source is required. For edit_mode=delete, pass an empty string.
- cell_type must be "code" or "markdown" when edit_mode=insert.
- edit_mode defaults to replace; use edit_mode=insert to add a cell and edit_mode=delete to remove a cell.`
