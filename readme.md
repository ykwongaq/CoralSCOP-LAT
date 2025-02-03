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

Download two models, `vit_h_decoder_quantized.onnx` and `vit_h_encoder_quantized.onnx`, from [OneDrive](https://hkustconnect-my.sharepoint.com/:f:/g/personal/ykwongaq_connect_ust_hk/EhRCvPn3zYRHjaGm43XYOz8ByFFJr6n9l75Gi7KkoEuVVA?e=PXGTcO), and save them into the models folder.

At the end, the `models` folder should have the following structure:

```
models
|- vit_b_coralscop.pth
|- vit_h_decoder_quantized.onnx
|- vit_h_encoder_quantized.onnx
```

## Todo
1. Quick Start
2. Rearrange id after delete
3. Smart exit alert
4. Statistic Page - Project level statistic
5. Tutorial
6. Pop up problem in mac
