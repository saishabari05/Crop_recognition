# Previous EfficientNet-B0 integration kept below for reference.
# from __future__ import annotations
#
# from dataclasses import dataclass
# from io import BytesIO
# import os
# from pathlib import Path
# from typing import Dict
#
# from PIL import Image
#
# try:
#     import torch
#     import torch.nn as nn
#     from torchvision import models, transforms
# except Exception:
#     torch = None
#     nn = None
#     models = None
#     transforms = None
#
#
# @dataclass
# class PredictionResult:
#     crop: str
#     disease: str
#     confidence: float
#
#     def to_dict(self) -> Dict[str, str | float]:
#         return {
#             "crop": self.crop,
#             "disease": self.disease,
#             "confidence": self.confidence,
#         }
#
#
# _DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "model.pt"
# _MODEL_PATH_ENV = os.getenv("MODEL_PATH", str(_DEFAULT_MODEL_PATH))
# MODEL_PATH = Path(_MODEL_PATH_ENV)
# if not MODEL_PATH.is_absolute():
#     MODEL_PATH = Path(__file__).resolve().parent / MODEL_PATH
# IMAGE_SIZE = int(os.getenv("MODEL_IMAGE_SIZE", "224"))
# CLASSES_PATH = Path(os.getenv("MODEL_CLASSES_PATH", str(Path(__file__).resolve().parent / "classes.txt")))
# if not CLASSES_PATH.is_absolute():
#     CLASSES_PATH = Path(__file__).resolve().parent / CLASSES_PATH
#
#
# def _load_class_names() -> list[str]:
#     if not CLASSES_PATH.exists():
#         raise RuntimeError(
#             f"Classes file not found at {CLASSES_PATH}. Add classes.txt or set MODEL_CLASSES_PATH in .env."
#         )
#
#     with CLASSES_PATH.open("r", encoding="utf-8") as file:
#         classes = [line.strip() for line in file.readlines() if line.strip()]
#
#     if not classes:
#         raise RuntimeError("classes.txt is empty.")
#
#     return classes
#
#
# def load_model() -> object:
#     if torch is None or nn is None or models is None:
#         raise RuntimeError(
#             "PyTorch is not installed. Install torch and torchvision to use model.pt integration."
#         )
#
#     if not MODEL_PATH.exists():
#         raise RuntimeError(
#             f"Model file not found at {MODEL_PATH}. Put your model file there or set MODEL_PATH in .env."
#         )
#
#     class_names = _load_class_names()
#     model = models.efficientnet_b0(weights=None)
#     model.classifier[1] = nn.Linear(1280, len(class_names))
#     state_dict = torch.load(MODEL_PATH, map_location="cpu")
#     model.load_state_dict(state_dict)
#     model.eval()
#     return model
#
#
# def preprocess_image(image_bytes: bytes) -> Image.Image:
#     return Image.open(BytesIO(image_bytes)).convert("RGB")
#
#
# def _build_transform():
#     if transforms is None:
#         raise RuntimeError(
#             "torchvision is not installed. Install torchvision to preprocess images."
#         )
#
#     return transforms.Compose(
#         [
#             transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
#             transforms.ToTensor(),
#             transforms.Normalize(
#                 mean=[0.485, 0.456, 0.406],
#                 std=[0.229, 0.224, 0.225],
#             ),
#         ]
#     )
#
#
# def _decode_label(label: str) -> tuple[str, str]:
#     if "___" in label:
#         crop, disease = label.split("___", 1)
#         return crop.replace("_", " "), disease.replace("_", " ")
#
#     if "_" in label:
#         crop, disease = label.split("_", 1)
#         return crop.replace("_", " "), disease.replace("_", " ")
#
#     return "Unknown", label.replace("_", " ")
#
#
# def run_inference(model: object, image: Image.Image) -> PredictionResult:
#     if torch is None:
#         raise RuntimeError("PyTorch is not installed.")
#     class_names = _load_class_names()
#
#     transform = _build_transform()
#     input_tensor = transform(image).unsqueeze(0)
#
#     with torch.no_grad():
#         output = model(input_tensor)
#         if isinstance(output, (tuple, list)):
#             output = output[0]
#
#         probabilities = torch.softmax(output, dim=1)
#         confidence, predicted_idx = torch.max(probabilities, dim=1)
#
#     idx = int(predicted_idx.item())
#     if idx >= len(class_names):
#         raise RuntimeError(
#             f"Predicted class index {idx} is outside classes.txt length {len(class_names)}."
#         )
#
#     label = class_names[idx]
#     crop, disease = _decode_label(label)
#
#     return PredictionResult(
#         crop=crop,
#         disease=disease,
#         confidence=float(confidence.item()),
#     )
#
# _MODEL: object | None = None
#
# def get_model() -> object:
#     global _MODEL
#     if _MODEL is None:
#         _MODEL = load_model()
#     return _MODEL
#
# def predict_disease(image_bytes: bytes) -> Dict[str, str | float]:
#     model = get_model()
#     image = preprocess_image(image_bytes)
#     result = run_inference(model, image)
#     return result.to_dict()

from __future__ import annotations

import base64
from dataclasses import dataclass
from io import BytesIO
import os
from pathlib import Path
from typing import Dict

from PIL import Image

try:
    import numpy as np
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torchvision import models, transforms
except Exception:
    np = None
    torch = None
    nn = None
    F = None
    models = None
    transforms = None


@dataclass
class PredictionResult:
    crop: str
    disease: str
    confidence: float

    def to_dict(self) -> Dict[str, str | float]:
        return {
            "crop": self.crop,
            "disease": self.disease,
            "confidence": self.confidence,
        }


_DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "b3_model.pt"
_MODEL_PATH_ENV = os.getenv("MODEL_PATH", str(_DEFAULT_MODEL_PATH))
MODEL_PATH = Path(_MODEL_PATH_ENV)
if not MODEL_PATH.is_absolute():
    MODEL_PATH = Path(__file__).resolve().parent / MODEL_PATH

IMAGE_SIZE = int(os.getenv("MODEL_IMAGE_SIZE", "300"))

CLASSES_PATH = Path(
    os.getenv("MODEL_CLASSES_PATH", str(Path(__file__).resolve().parent / "classes.txt"))
)
if not CLASSES_PATH.is_absolute():
    CLASSES_PATH = Path(__file__).resolve().parent / CLASSES_PATH


def _load_class_names() -> list[str]:
    if not CLASSES_PATH.exists():
        raise RuntimeError(
            f"Classes file not found at {CLASSES_PATH}. Add classes.txt or set MODEL_CLASSES_PATH in .env."
        )

    with CLASSES_PATH.open("r", encoding="utf-8") as file:
        classes = [line.strip() for line in file.readlines() if line.strip()]

    if not classes:
        raise RuntimeError("classes.txt is empty.")

    return classes


def load_model() -> object:
    if torch is None or nn is None or models is None:
        raise RuntimeError(
            "PyTorch is not installed. Install torch and torchvision to use b3_model.pt integration."
        )

    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"Model file not found at {MODEL_PATH}. Put your model file there or set MODEL_PATH in .env."
        )

    class_names = _load_class_names()
    model = models.efficientnet_b3(weights=None)
    model.classifier[1] = nn.Linear(1536, len(class_names))
    state_dict = torch.load(MODEL_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()
    return model


def preprocess_image(image_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def _build_transform():
    if transforms is None:
        raise RuntimeError(
            "torchvision is not installed. Install torchvision to preprocess images."
        )

    return transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            # transforms.Normalize(
            #     mean=[0.485, 0.456, 0.406],
            #     std=[0.229, 0.224, 0.225],
            # ),
        ]
    )


def _decode_label(label: str) -> tuple[str, str]:
    if "___" in label:
        crop, disease = label.split("___", 1)
        return crop.replace("_", " "), disease.replace("_", " ")

    if "_" in label:
        crop, disease = label.split("_", 1)
        return crop.replace("_", " "), disease.replace("_", " ")

    return "Unknown", label.replace("_", " ")


def run_inference(model: object, image: Image.Image) -> PredictionResult:
    if torch is None:
        raise RuntimeError("PyTorch is not installed.")

    class_names = _load_class_names()
    transform = _build_transform()
    input_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(input_tensor)
        if isinstance(output, (tuple, list)):
            output = output[0]

        probabilities = torch.softmax(output, dim=1)
        confidence, predicted_idx = torch.max(probabilities, dim=1)

    idx = int(predicted_idx.item())
    if idx >= len(class_names):
        raise RuntimeError(
            f"Predicted class index {idx} is outside classes.txt length {len(class_names)}."
        )

    label = class_names[idx]
    crop, disease = _decode_label(label)

    return PredictionResult(
        crop=crop,
        disease=disease,
        confidence=float(confidence.item()),
    )


def _build_leaf_mask(image_np: np.ndarray) -> np.ndarray:
    rgb = image_np.astype(np.float32) / 255.0
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]

    excess_green = (2.0 * green) - red - blue
    vegetation_mask = (excess_green > 0.04) & (green > 0.18)

    mask_ratio = float(vegetation_mask.mean())
    if mask_ratio < 0.05:
        return np.ones((image_np.shape[0], image_np.shape[1]), dtype=np.float32)

    return vegetation_mask.astype(np.float32)


def _cam_to_heat_rgb(cam: np.ndarray) -> np.ndarray:
    r = np.clip(1.5 * cam, 0.0, 1.0)
    g = np.clip(1.8 * (cam - 0.15), 0.0, 1.0)
    b = np.clip(1.4 * (0.7 - cam), 0.0, 1.0)
    return np.stack([r, g, b], axis=2)


def _to_data_url(image_np: np.ndarray) -> str:
    image_uint8 = np.clip(image_np * 255.0, 0, 255).astype(np.uint8)
    image = Image.fromarray(image_uint8)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _resolve_gradcam_target_layer(model: object) -> object:
    # EfficientNet-B3: use a finer feature block than the very last conv output.
    return model.features[-2]


def generate_gradcam_image(model: object, image: Image.Image) -> str | None:
    if torch is None or F is None or np is None:
        return None

    activations: dict[str, torch.Tensor] = {}
    gradients: dict[str, torch.Tensor] = {}
    target_layer = _resolve_gradcam_target_layer(model)

    def _forward_hook(_module, _inputs, output):
        activations["value"] = output

    def _backward_hook(_module, _grad_input, grad_output):
        gradients["value"] = grad_output[0]

    forward_handle = target_layer.register_forward_hook(_forward_hook)
    backward_handle = target_layer.register_full_backward_hook(_backward_hook)

    try:
        model.zero_grad(set_to_none=True)
        input_tensor = _build_transform()(image).unsqueeze(0)
        output = model(input_tensor)
        if isinstance(output, (tuple, list)):
            output = output[0]

        predicted_idx = int(torch.argmax(output, dim=1).item())
        score = output[0, predicted_idx]
        score.backward()

        if "value" not in activations or "value" not in gradients:
            return None

        act = activations["value"][0]
        grad = gradients["value"][0]

        weights = grad.mean(dim=(1, 2), keepdim=True)
        cam = (weights * act).sum(dim=0)
        cam = torch.relu(cam)

        cam = cam.unsqueeze(0).unsqueeze(0)
        cam = F.interpolate(
            cam,
            size=(image.height, image.width),
            mode="bilinear",
            align_corners=False,
        )[0, 0]

        cam_np = cam.detach().cpu().numpy().astype(np.float32)
        max_value = float(cam_np.max())
        if max_value <= 0.0:
            return None

        cam_np /= max_value
        threshold = float(np.percentile(cam_np, 80))
        cam_np = np.where(cam_np >= threshold, cam_np, 0.0)

        image_np = np.array(image).astype(np.uint8)
        leaf_mask = _build_leaf_mask(image_np)
        cam_np = cam_np * leaf_mask

        masked_max = float(cam_np.max())
        if masked_max <= 0.0:
            return None

        cam_np /= masked_max
        cam_np = np.power(cam_np, 0.75)

        heat_rgb = _cam_to_heat_rgb(cam_np)
        base_rgb = image_np.astype(np.float32) / 255.0
        alpha = (0.15 + 0.65 * cam_np)[..., None]
        overlay = base_rgb * (1.0 - alpha) + heat_rgb * alpha

        return _to_data_url(overlay)
    finally:
        forward_handle.remove()
        backward_handle.remove()
        model.zero_grad(set_to_none=True)


_MODEL: object | None = None


def get_model() -> object:
    global _MODEL
    if _MODEL is None:
        _MODEL = load_model()
    return _MODEL


def predict_disease(image_bytes: bytes) -> Dict[str, str | float]:
    model = get_model()
    image = preprocess_image(image_bytes)
    result = run_inference(model, image)
    response = result.to_dict()

    gradcam_image = None
    try:
        gradcam_image = generate_gradcam_image(model, image)
    except Exception:
        gradcam_image = None

    response["gradcam_image"] = gradcam_image
    return response
