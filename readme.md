# Installation Guide

## 1. Install Anaconda

Install `Anaconda` from this link `https://www.anaconda.com/download`

## 2. Launch Anaconda and Create Environment

Launch anaconda and create `Python` Environment by executing the following command

```
conda create -n coralscop-lat python=3.8
```

Then activate it by

```
conda activate coralscop-lat
```

## 3. Install required packages

Move to the source code folder:

```
cd <path to CoralSCOP-LAT>
```

Install required packages:

```bash
pip install -r requirements.txt
```

## 4. Download Models

Create `models` folder

### Download CoralSCOP model

Download the `CoralSCOP` Model weight from `https://github.com/zhengziqiang/CoralSCOP` and move it to `models` folder

### Download SAM model

Download the `vit-h` model from SAM `https://github.com/facebookresearch/segment-anything`

### Convert SAM model to Onnx

Run the following program

```bash
python gen_sam_onnx.py --checkpoint [path to sam model] --output_dir [output_dir] --model-type vit_h
```

The above command will generate the onnx model to `output_dir`, extract the `vit_h_decoder_quantized.onnx` and `vit_h_encoder_quantized.onnx` to `models` folder

At the end, the `models` folder should have the following structure:

```
models
|- vit_b_coralscop.pth
|- vit_h_decoder_quantized.onnx
|- vit_h_encoder_quantized.onnx
```

# 5. Download Font Awesome 6

Download `Font Awesome 6` `Free For Web` here `https://fontawesome.com/download` and extract the folder to `web/css`

The structure for `css` folder should be

css
|- fontawesome-free-6.6.0-web
|- labelPage
|- preprocessPage
|- ...

```

## Todo

1. Continue button from project creation page to labeling page
2. Undo and Redo
3. Shortcuts
4. Quick Start
5. Rearrange id after delete
6. Smart exit alert
7. Statistic Page - Project level statistic
8. Create mask with category
9. Prevent multiple click on the navigation bar
```
