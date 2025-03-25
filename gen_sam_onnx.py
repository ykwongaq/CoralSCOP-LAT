from segment_anything import sam_model_registry
from segment_anything.utils.onnx import SamOnnxModel
import torch
import os
import argparse 

from onnxruntime.quantization.quantize import quantize_dynamic
from onnxruntime.quantization import QuantType

def export_encoder(sam, output):
    torch.onnx.export(
        f=output,
        model=sam.image_encoder,
        args=torch.randn(1, 3, 1024, 1024),
        input_names=["images"],
        output_names=["embeddings"],
        export_params=True
    )  
    quantize_output = output.replace(".onnx", "_quantized.onnx")
    quantize_dynamic(
        model_input=output,
        model_output=quantize_output,
        per_channel=False,
        reduce_range=False,
        weight_type=QuantType.QUInt8,
        optimize_model=True
    )

def export_decoder(sam, output):

    # Export masks decoder from SAM model to ONNX
    onnx_model = SamOnnxModel(sam, return_single_mask=True)
    embed_dim = sam.prompt_encoder.embed_dim
    embed_size = sam.prompt_encoder.image_embedding_size
    mask_input_size = [4 * x for x in embed_size]
    dummy_inputs = {
        "image_embeddings": torch.randn(1, embed_dim, *embed_size, dtype=torch.float),
        "point_coords": torch.randint(low=0, high=1024, size=(1, 5, 2), dtype=torch.float),
        "point_labels": torch.randint(low=0, high=4, size=(1, 5), dtype=torch.float),
        "mask_input": torch.randn(1, 1, *mask_input_size, dtype=torch.float),
        "has_mask_input": torch.tensor([1], dtype=torch.float),
        "orig_im_size": torch.tensor([1500, 2250], dtype=torch.float),
    }
    output_names = ["masks", "iou_predictions", "low_res_masks"]
    torch.onnx.export(
        f=output,
        model=onnx_model,
        args=tuple(dummy_inputs.values()),
        input_names=list(dummy_inputs.keys()),
        output_names=output_names,
        dynamic_axes={
            "point_coords": {1: "num_points"},
            "point_labels": {1: "num_points"}
        },
        export_params=True,
        opset_version=17,
        do_constant_folding=True
    )
    quantize_output = output.replace(".onnx", "_quantized.onnx")
    quantize_dynamic(
        model_input=output,
        model_output=quantize_output,
        per_channel=False,
        reduce_range=False,
        weight_type=QuantType.QUInt8,
        optimize_model=True
    )


def main(args):

    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    model_type = args.model_type

    checkpoint = args.checkpoint
    sam = sam_model_registry[model_type](checkpoint=checkpoint)

    encoder_output = os.path.join(output_dir, f"{model_type}_encoder.onnx")
    print(f"Exporting encoder to {encoder_output}")
    export_encoder(sam, encoder_output)

    decoder_output = os.path.join(output_dir, f"{model_type}_decoder.onnx") 
    print(f"Exporting decoder to {decoder_output}")
    export_decoder(sam, decoder_output)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Export the SAM prompt encoder and mask decoder to an ONNX model."
    )

    parser.add_argument(
        "--checkpoint", type=str, required=True, help="The path to the SAM model checkpoint."
    )

    parser.add_argument(
        "--output_dir", type=str, required=True, help="The filename to save the ONNX model to."
    )

    parser.add_argument(
        "--model-type",
        type=str,
        required=True,
        help="In ['default', 'vit_h', 'vit_l', 'vit_b']. Which type of SAM model to export.",
    )

    args = parser.parse_args()
    main(args)