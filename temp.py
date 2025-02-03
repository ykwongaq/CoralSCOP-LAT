import os
import tkinter as tk
from tkinter import filedialog, messagebox


def get_save_file_path():
    # Create a Tkinter root window (hidden)
    root = tk.Tk()
    root.withdraw()  # Hide the root window

    # Ask the user for the file path
    file_path = filedialog.asksaveasfilename(
        title="Save File",
        defaultextension=".txt",  # Default file extension
        filetypes=[("Text Files", "*.txt")],  # File type options
    )

    # Check if the user canceled the dialog
    if not file_path:
        print("No file selected. Operation canceled.")
        return None

    # # Check if the file already exists
    # if os.path.exists(file_path):
    #     # Ask for confirmation to overwrite the file
    #     confirm = messagebox.askyesno(
    #         "File Exists",
    #         f"The file '{os.path.basename(file_path)}' already exists. Do you want to overwrite it?",
    #     )
    #     if not confirm:
    #         print("File overwrite canceled.")
    #         return None  # User doesn't want to overwrite

    # Return the selected file path
    return file_path


# Example usage
if __name__ == "__main__":
    save_path = get_save_file_path()
    if save_path:
        print(f"File will be saved at: {save_path}")
        # You can now save your file at the specified path
        # For example:
        with open(save_path, "w") as f:
            f.write("This is a test file.")  # Write your content here
    else:
        print("No file path was provided.")
