from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
import pydicom
import numpy as np
from PIL import Image
import os
import uuid
import requests
from PIL import ImageDraw
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
CONVERTED_FOLDER = "converted"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)

# Roboflow credentials
ROBOFLOW_API_KEY = "ofeFwmXPZTGUTTkfN97c"
ROBOFLOW_MODEL_ID = "adr/6"

@app.get("/")
def read_root():
    return {"message": "Dental X-ray API running"}

@app.post("/upload/")
async def upload_dicom(file: UploadFile = File(...)):
    file_ext = file.filename.split('.')[-1].lower()
    print("📥 Received file:", file.filename)

    if file_ext not in ['dcm', 'rvg']:
        return {"error": "Only .dcm or .rvg files are allowed."}

    file_id = str(uuid.uuid4())
    dicom_path = os.path.join(UPLOAD_FOLDER, f"{file_id}.dcm")

    # Save uploaded DICOM file
    with open(dicom_path, "wb") as f:
        f.write(await file.read())

    try:
        # Load DICOM and extract pixel data
        dicom = pydicom.dcmread(dicom_path)
        pixel_array = dicom.pixel_array.astype(np.float32)
        pixel_array = np.nan_to_num(pixel_array)  # Handle NaNs

        print("🧮 Pixel array shape:", pixel_array.shape)
        print("🧮 Pixel min:", pixel_array.min(), "max:", pixel_array.max())

        # Normalize to 0–255
        pixel_array -= pixel_array.min()
        if pixel_array.max() != 0:
            pixel_array /= pixel_array.max()
        pixel_array *= 255.0

        # Convert to 8-bit grayscale image
        image = Image.fromarray(pixel_array.astype(np.uint8)).convert("L")
        png_path = os.path.join(CONVERTED_FOLDER, f"{file_id}.png")

        try:
            image.save(png_path)
        except Exception as e:
            print("❌ Failed to save PNG:", str(e))
            raise HTTPException(status_code=500, detail="Error saving PNG image.")

        # Verify file size
        image_size = os.path.getsize(png_path)
        print(f"✅ Saved PNG: {png_path}, Size: {image_size} bytes")

        if image_size == 0:
            raise HTTPException(status_code=500, detail="Generated PNG image is empty (0 bytes)")

        # Send image to Roboflow API
        with open(png_path, "rb") as img_file:
            files = {
                "file": (os.path.basename(png_path), img_file, "image/png")
            }
            response = requests.post(
                f"https://detect.roboflow.com/{ROBOFLOW_MODEL_ID}",
                params={
                    "api_key": ROBOFLOW_API_KEY,
                    "confidence": 0.3,
                    "overlap": 0.5
                },
                files=files
            )

        if response.status_code != 200:
            print("❌ Roboflow error:", response.status_code, response.text)
            raise HTTPException(status_code=500, detail=f"Roboflow API error: {response.text}")

        predictions = response.json()
        # Reload the image in RGB to draw on it
        annotated_image = image.convert("RGB")
        draw = ImageDraw.Draw(annotated_image)

        # Loop through all predictions and draw boxes
        for pred in predictions.get("predictions", []):
            x = pred["x"]
            y = pred["y"]
            w = pred["width"]
            h = pred["height"]
            label = pred["class"]
            confidence = pred["confidence"]

            left = x - w / 2
            top = y - h / 2
            right = x + w / 2
            bottom = y + h / 2

            draw.rectangle([left, top, right, bottom], outline="red", width=3)
            draw.text((left, top - 10), f"{label} ({confidence:.2f})", fill="red")

        # Save the annotated version
        annotated_path = os.path.join(CONVERTED_FOLDER, f"{file_id}_annotated.png")
        annotated_image.save(annotated_path)
        # Generate dummy diagnostic report
        unique_classes = set(pred["class"] for pred in predictions.get("predictions", []))
        if unique_classes:
            report = f"The image shows possible signs of: {', '.join(unique_classes)}. Recommend dental review for confirmation."
        else:
            report = "No significant pathologies detected in the image."



        print("✅ Roboflow predictions received.")

        return {
    "original_image_url": f"/converted/{os.path.basename(png_path)}",
    "annotated_image_url": f"/converted/{os.path.basename(annotated_path)}",
    "predictions": predictions,
    "report": report
}

    except Exception as e:
        print("❌ Error processing DICOM or Roboflow request:", str(e))
        return {"error": f"Processing failed: {str(e)}"}

@app.get("/converted/{image_name}")
def get_converted_image(image_name: str):
    path = os.path.join(CONVERTED_FOLDER, image_name)
    if os.path.exists(path):
        return FileResponse(path, media_type="image/png")
    else:
        raise HTTPException(status_code=404, detail="Image not found")

