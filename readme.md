<div align="center">
<h1>CoralSCOP-LAT: Labeling and analyzing tool for coral reef images with dense segmantic mask</h1>

<a href="https://www.sciencedirect.com/science/article/pii/S157495412500411X" target="_blank" rel="noopener noreferrer">
<img alt="Static Badge" src="https://img.shields.io/badge/
paper-Ecological%20Informatics-blue">
</a>
<a href="https://hkustconnect-my.sharepoint.com/:f:/g/personal/ykwongaq_connect_ust_hk/Eh3ZxkV2c-lIksa4wCYy1YcBCs5PEORfj1saV-3oYsT0tw" target="_blank" rel="noopener noreferrer">
<img alt="Static Badge" src="https://img.shields.io/badge/
package-Window-green">
</a>

<br/>

[Yuk-Kwan Wong]()<sup>1</sup>, [Ziqiang Zheng]()<sup>1</sup>, [Mingzhe Zhangddd]()<sup>1</sup>, [David J. Suggett]()<sup>2,3</sup>, [Sai-Kit Yeung]()<sup>1</sup>

<sup>1</sup> Hong Kong University of Science and Technology &nbsp;&nbsp;
<sup>2</sup> King Abdullah University of Science and Technology, Saudi Arabia &nbsp;&nbsp;
<sup>3</sup> University of Technology Sydney, Australia

</div>

## Overview

CoralSCOP-LAT is a semi-automatic annotation and analysis tool for coral reef imagery, developed to overcome the limitations of traditional point-based methods. Built on the CoralSCOP foundation model, it delivers dense segmentation masks with strong zero-shot generalization across diverse reef sites. The tool streamlines research workflows by providing automatic coral segmentation, customizable labeling, and integrated statistical reporting, enabling efficient, accurate, and flexible large-scale coral reef monitoring and conservation studies.

<p align="center">
  <img src="images/teaser.png" alt="Teaser Image">
</p>

## Installation

-   [Build From Source](#build-from-source)
-   [Window](#window)

### Build From Source

It is recommeded to build **CoralSCOP-LAT** from source, if you are confident in configuration of `python` enivornment using `Anaconda`.

#### 1. Install Anaconda

Install `Anaconda` from the [link](https://www.anaconda.com/download)

#### 2. Create Environment

Create an `Anaconda` environment by

```bash
conda create -n coralscop-lat python=3.10
```

Then activate it by

```bash
conda activate coralscop-lat
```

Then install the required package by

```bash
cd <path to CoralSCOP-LAT>
pip install -r requirements.txt
```

#### 3. Download Models

Create `sat/models` folder

Download three models, `vit_b_coralscop.pth`, `vit_b_decoder_quantized.onnx`, and `vit_b_encoder_quantized.onnx` from [OneDrive](https://hkustconnect-my.sharepoint.com/:f:/g/personal/ykwongaq_connect_ust_hk/EhRCvPn3zYRHjaGm43XYOz8ByFFJr6n9l75Gi7KkoEuVVA?e=PXGTcO), and save them into the models folder.

At the end, the `models` folder should have the following structure:

```
models
|- vit_b_coralscop.pth
|- vit_b_decoder_quantized.onnx
|- vit_b_encoder_quantized.onnx
```

#### 4. Launch Application

Run the following command to launch the application

```bash
cd sat
python main.py
```

### Window

A distribution package is available for `Windows` users.

Download `CoralSCOP-LAT-Windowe.zip` from [OneDrive](https://hkustconnect-my.sharepoint.com/:f:/g/personal/ykwongaq_connect_ust_hk/Eh3ZxkV2c-lIksa4wCYy1YcBCs5PEORfj1saV-3oYsT0tw).

Unzip the file and double click the `CoralSCOP-LAT.exe` file to launch the file.

A ``macOS` version is planned for future development.

## Tutorial

Coming Soon.

## Reference

CoralSCOP-LAT is built on top of the coral segmentation model **[CoralSCOP](https://coralscop.hkustvgd.com/)**.

## Citation

If you find our repository useful, please consider giving it a star ⭐ and citing our paper in your work:

```bibtex
@article{WONG2025103402,
    title = {CoralSCOP-LAT: Labeling and analyzing tool for coral reef images with dense semantic mask},
    journal = {Ecological Informatics},
    volume = {91},
    pages = {103402},
    year = {2025},
    issn = {1574-9541},
    doi = {https://doi.org/10.1016/j.ecoinf.2025.103402},
    url = {https://www.sciencedirect.com/science/article/pii/S157495412500411X},
    author = {Yuk Kwan Wong and Ziqiang Zheng and Mingzhe Zhang and David J. Suggett and Sai-Kit Yeung},
    keywords = {Coral reefs, Coral segmentation, Semi-automatic annotation tool, Machine learning
}
```
