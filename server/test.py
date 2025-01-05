import onnxruntime as ort
from util.onnx import preprocess_image
import numpy as np
from PIL import Image

encoder_path = "../models/coralscop_decoder_quantized.onnx"
encoder = ort.InferenceSession(encoder_path)

image_path = "C://Users//WYK//OneDrive - HKUST Connect//Mphil//Research//MarineVOS//Gonzalo//SOCIETY_MOOREA_SOC-MO2_6M_downsample//images//20180905_UTP_QUADRAT_SOCMOO2_6M_1.jpg"
image = Image.open(image_path)

input_tensor = preprocess_image(image)
outputs = encoder.run(None, {"images": input_tensor})
print(outputs[0].shape)
