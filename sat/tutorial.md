# Segmentation Annotation Tool (SAT)

`SAT` is a segmentation annotation tool for images.

[TOC]



## Install and Launch

Please download the tool from ... (Current only window version is supported)

The downloaded tool folder should have the following structure

```
|- _internal
	|- ...
|- SAT.exe
```

The `_internal` folder contain the core source code of the program, so do not modify it.

Double click the `SAT.exe` to launch the tool.

## Workflow

The complete workflow of annotating an image work as follow;

1. Load the project by following instruction in [Load Project](#load-project)
2. Define new category by following instruction in [Add Category](#add-category)
3. Create mask by following instruction in [Create Mask](#create-mask)
4. Assign the label to the mask (if needed) by following instruction in [Assign Label To Mask](#assign-label-to-mask)
5. Keep repeating step 3 to 4 until all the objects in the image is labeled.
6. Go to the next image by following the instruction in [Navigate to Next Image](#navigate-to-next-image)
7. Keep repeating step 3 to 6 until all images is labeled.
8. Export the annotation to coco format by following the instruction in [Export COCO](#export-coco)

Do remember to save the project, by following the instruction in [Save Project](#save-project)  before you leave the `Label Page`.

## Load Project

After launching the tool, you will enter the `Main Page`.

![image-20250207105702373](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207105702373.png)

In the `Main Page`, click the `Load Existing Project` button.

![image-20250207105745250](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207105745250.png)

A pop up window will show up, click `Load Project` button to select a `.sat` file (only `.sat` file will be accepted). Then the project will be loaded.

## User Interface

![image-20250207110903675](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207110903675.png)

### 1. Function Bar

Handle navigation between pages, save project, exporting data, etc.

### 2. Label Panel

Contain a list of identified category. You can also adjust the visibility of masks here

### 3. Top Panel

Image navigation such as go to next image, previous image, or view all images.

### 4. Image Canvas

Display the currently annotating image and the masks

### 5. Action Panel

Enable action like add mask, remove mask, label mask, undo, redo, etc.

### 6. View Panel

Control the view point. User can make the view larger, smaller or return to the default view point.

## Label Panel

### Add Category

Once you identified a category (e.g. Cat) from the image, you need to define here.

<div style="display: flex; align-items: flex-start;">
    <img src="C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207111802763.png" 
         alt="Description" 
         style="width: 200px; height: auto; margin-right: 20px;">
    <p>
        <ol>
            <li>Click the <code>Add Label</code> button at the bottom of the panel.</li>
            <li>Type of the name of the text input.</li>
            <li>Click <code>Confirm</code> button or <code>Enter</code> to add the category</li>
    </ol>
    </p>
</div>

Once you add the category, it will be displayed on the list:

![image-20250207112607479](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207112607479.png)

### Mask Opacity

You can adjust the mask opacity here:

![image-20250207112700595](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207112700595.png)

### Show/Hide Mask

![image-20250207112722322](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207112722322.png)

To show the original image, you can hide the mask by toggle the above button, or using `Tab` as the shortcut

## Action Panel

### Create Mask

To create a mask, click the `Add Mask` button (or type the shortcut key `w`) to enter `Create Mask Mode`:

![image-20250207113145819](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207113145819.png)

Once you enter the `Create Mask Mode`, you can create the mask by clicking the corresponding region on the `Image Canvas`

![image-20250207114219420](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207114219420.png)

**Lift Click**: You can include this area to the mask by lift clicking the image

**Right Click**: You can exclude this area to the mask by right clicking the image.

The resulting mask will be displayed as the blue region, as shown above.

**Assign Label**: You can define the category of the mask by selecting the assign label. The shortcut is `r`.

![image-20250207115244870](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207115244870.png)

**Undo**: You can remove the last entering point. The shortcut is `ctrl+z`.

**Reset**: You can remove all the entering points. The shortcut is `r`.

**Confirm**: Once you think the mask is ready, you can click `Confirm` button to create the mask. The shortcut is space key.

**Back**: Once you finish creating the mask, you can click the `Back` button to return to the default mode. The shortcut is `w`.

### Assign Label to Mask

The red mask on the image indicating that this mask does not have the category yet. You should assign one category to it:

![image-20250207115831004](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207115831004.png)

To assign the label to the mask, first you need click select the target mask by left clicking it, then the mask will turn blue, which indicated that it has been selected:

![image-20250207120305809](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207120305809.png)

Then, please click the `Assign Mask` button, or click the shortcut `c`:

![image-20250207115911222](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207115911222.png)

After that, the category panel will pop up, showing all the defined label:

![image-20250207115943787](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207115943787.png)

If you cannot see any category label there, please add the category by following the instruction in [Crate Mask](#Add-Category).

Each category button show the corresponding category id.

Then, click the corresponding category button to assign the category to the selected mask. In this example, we assign category 1 (with the pink color).

![image-20250207120518526](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207120518526.png)

After that, the mask will be colored into corresponding number, with a text indicating the category id. Then you finish assigning the category to the mask.

To assign one category to multiple masks, you can select multiple masks at one time, and then click the category button.

### Remove Mask

To remove a unwanted mask from the image. Please select the mask by left clicking it. The mask mask will turn blue to indicated that it has been selected:

![image-20250207120748784](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207120748784.png)

Once the mask is selected, you can press the `Remove` button in the `Action Panel`, or press the shortcut key `r`:

![image-20250207120933377](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207120933377.png)

Then the mask will be removed.

If you want to remove multiple masks in one time. You can select multiple masks at one time, and then press the `Remove` button.

### Undo Operation

You can click the `Undo` button to undo the previous operation:

![image-20250207121105089](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207121105089.png)

### Redo Operation

You can click the `Redo` button to redo the operation:

![image-20250207121143172](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207121143172.png)

### View Panel 

#### Enlarge Image

You can enlarge the image by rotating the wheel on your mouse. Or you can click the `Large` button in the `View Panel`

![image-20250207121521315](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207121521315.png)

### Shrink Image

You can shrink the image by rotating the wheel on your mouse. Or you can click the `Shrink` button in the `View Panel`:

![image-20250207121630009](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207121630009.png)

### Restore Default View

To restore default viewpoint, you can click the `Restore` button in the `View Panel`:

![image-20250207121726069](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207121726069.png)

Or you can click the shortcut `s`.

## Top Panel

### Navigate to Next Image

To navigate to the next image, you can click the next button in the `Top Panel`:

![image-20250207122110266](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207122110266.png)

Or you can click the shortcut `D`.

### Navigate to Previous Image

To navigate to the previous image, you can click the previous button in the `Top Panel`:

![image-20250207122005047](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207122005047.png)

Or you can click the shortcut `A`.

### View All Images

Click the `All Image` button,  then you can see all the images in this project. You can directly jump to the target image by clicking it:

![image-20250207122229276](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207122229276.png)

## Function Bar

### Back To Main Page

![image-20250207122639436](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207122639436.png)

This is the`Home` button for you to go back to the `Main Page`. Remember to save your work before leaving

### View All Images

![image-20250207122804685](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207122804685.png)

You can view all the images by click this button. And you jump to that image by selecting the image.

### Go to Label Page

![image-20250207122904223](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207122904223.png)

You can go to the label page by clicking this `Label` button

### Import Json Annotation

![image-20250207122924745](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207122924745.png)

If you have the COCO `JSON` file containing all the masks. You can import the mask from the `JSON` file by clicking this button. Please note that all the existing annotation will be erased to avoid confliction in annotation.

### Save Project

![image-20250207123100095](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207123100095.png)

Always remember to save the project before you leave the application. You can click `Save` to save the process in current project file, or click `Save To` to save the new project in target path.

### Export

![image-20250207123211976](C:\Users\arkwa\AppData\Roaming\Typora\typora-user-images\image-20250207123211976.png)

You can export the data to specific location.

#### Export Images

When you click `Export Image` button, it will export all the original images to the specified path.

#### Export Annotated Images

When you click `Export Annotated Image`, it will export all the image with annotation visualization to the specified path.

#### Export COCO

When you click `Export COCO`, it will export all you annotation in `COCO` format.

#### Export All

When you click `Export All`, it will export all the above files to the specified location. 