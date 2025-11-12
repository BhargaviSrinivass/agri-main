# ====================================================================
# IMPORTS
# ====================================================================

import os
import io
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

import torch
import torch.nn as nn
from torchvision import models, transforms, datasets

# ====================================================================
# FLASK APP SETUP
# ====================================================================

app = Flask(__name__)
CORS(app)  # ✅ Allow all origins for development

# ====================================================================
# CONFIGURATION
# ====================================================================

DATA_DIR = r"D:\Projects\Hackshetra1.0\hackkshetra1.0\agri-main\ml-service\plant_disease_data"
MODEL_SAVE_PATH = "resnet50_crop_disease_best.pth"
UPLOAD_FOLDER = "./uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

# ====================================================================
# LOAD CLASS NAMES DYNAMICALLY
# ====================================================================

if os.path.exists(DATA_DIR):
    dataset = datasets.ImageFolder(DATA_DIR)
    CLASS_NAMES = dataset.classes
    NUM_CLASSES = len(CLASS_NAMES)
    print(f"✅ Loaded {NUM_CLASSES} classes dynamically: {CLASS_NAMES}")
else:
    CLASS_NAMES = []
    NUM_CLASSES = 0
    print("⚠️ Warning: Dataset folder not found. Using empty class list.")

# ====================================================================
# MODEL LOADING
# ====================================================================

def load_model(path):
    try:
        print("Loading ResNet-50 structure...")
        model = models.resnet50(weights=None)
        num_ftrs = model.fc.in_features
        model.fc = nn.Linear(num_ftrs, NUM_CLASSES)
        
        # Load the model even if training was stopped early
        if os.path.exists(path):
            model.load_state_dict(torch.load(path, map_location=device))
            print(f"✅ Model loaded successfully from {path}")
        else:
            print("⚠️ No saved model found. Using untrained model.")
            
        model.to(device)
        model.eval()
        return model
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return None

model = load_model(MODEL_SAVE_PATH)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ====================================================================
# HELPER FUNCTIONS
# ====================================================================

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def get_treatment_recommendation(disease):
    """Simple treatment recommendations based on disease"""
    disease = disease.lower()
    
    treatments = {
        "powdery_mildew": "Apply sulfur-based fungicide and improve air circulation. Remove severely infected leaves.",
        "leaf_spot": "Remove affected leaves and apply copper-based fungicide. Avoid overhead watering.",
        "blight": "Apply fungicide and avoid overhead watering. Remove and destroy infected plants.",
        "rust": "Apply fungicide and remove infected plant parts. Ensure good air circulation.",
        "mold": "Improve ventilation and reduce humidity. Apply appropriate fungicide.",
        "rot": "Improve drainage and avoid overwatering. Remove affected parts immediately.",
        "spot": "Apply fungicide and ensure proper spacing between plants for air flow.",
        "healthy": "No treatment needed - plant is healthy. Continue regular maintenance."
    }
    
    for key, treatment in treatments.items():
        if key in disease:
            return treatment
    
    return "Consult with agricultural expert for specific treatment recommendations. Maintain proper watering and nutrition."

# ====================================================================
# TRANSFORMS FOR INFERENCE
# ====================================================================

inference_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)
])

# ====================================================================
# ROUTES
# ====================================================================

@app.route("/")
def home():
    return jsonify({
        "success": True,
        "message": "Crop Disease Detection API is running!",
        "classes_loaded": NUM_CLASSES
    })

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({
            "success": False, 
            "message": "No image file uploaded"
        }), 400

    file = request.files["image"]
    image_type = request.form.get('imageType', 'crop')
    
    if file and allowed_file(file.filename):
        try:
            # Read and process image
            image_bytes = file.read()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            input_tensor = inference_transform(image).unsqueeze(0).to(device)

            # Make prediction
            with torch.no_grad():
                outputs = model(input_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                _, predicted_index = torch.max(outputs, 1)

            predicted_class = CLASS_NAMES[predicted_index.item()]
            confidence = probabilities[0, predicted_index.item()].item()
            
            # FIXED: Better disease detection logic
            detected = is_disease_detected(predicted_class)
            
            # Generate appropriate message and treatment
            if detected:
                message = f"Disease detected: {format_disease_name(predicted_class)}"
                treatment = get_treatment_recommendation(predicted_class)
            else:
                message = f"Plant is healthy: {format_disease_name(predicted_class)}"
                treatment = "No treatment needed - plant is healthy. Continue regular maintenance."

            return jsonify({
                "success": True,
                "message": message,
                "filename": file.filename,
                "imageType": image_type,
                "detection": {
                    "detected": detected,
                    "disease": format_disease_name(predicted_class),
                    "confidence": confidence,
                    "treatment": treatment
                }
            })

        except Exception as e:
            print(f"Prediction error: {e}")
            return jsonify({
                "success": False,
                "message": f"Prediction error: {str(e)}"
            }), 500

    else:
        return jsonify({
            "success": False,
            "message": "Invalid file type. Only PNG, JPG, JPEG, GIF allowed."
        }), 400

def is_disease_detected(class_name):
    """Determine if the prediction indicates a disease"""
    class_lower = class_name.lower()
    
    # If class name contains 'healthy', it's not a disease
    if 'healthy' in class_lower:
        return False
    
    # If class name contains common disease indicators, it's a disease
    disease_indicators = ['blight', 'spot', 'rot', 'mold', 'mildew', 'rust', 'powdery', 'bacterial', 'fungal', 'virus']
    for indicator in disease_indicators:
        if indicator in class_lower:
            return True
    
    # Default: assume it's a disease if not explicitly healthy
    return 'healthy' not in class_lower

def format_disease_name(class_name):
    """Format the class name for better display"""
    # Remove file naming conventions and make it readable
    formatted = class_name.replace('__', ' ').replace('_', ' ').replace('  ', ' ')
    
    # Capitalize first letter of each word
    formatted = ' '.join(word.capitalize() for word in formatted.split())
    
    return formatted

def get_treatment_recommendation(disease_class):
    """Simple treatment recommendations based on disease"""
    class_lower = disease_class.lower()
    
    treatments = {
        "powdery_mildew": "Apply sulfur-based fungicide and improve air circulation. Remove severely infected leaves.",
        "leaf_spot": "Remove affected leaves and apply copper-based fungicide. Avoid overhead watering.",
        "blight": "Apply fungicide and avoid overhead watering. Remove and destroy infected plants.",
        "rust": "Apply fungicide and remove infected plant parts. Ensure good air circulation.",
        "mold": "Improve ventilation and reduce humidity. Apply appropriate fungicide.",
        "rot": "Improve drainage and avoid overwatering. Remove affected parts immediately.",
        "spot": "Apply fungicide and ensure proper spacing between plants for air flow.",
    }
    
    for key, treatment in treatments.items():
        if key in class_lower:
            return treatment
    
    # If no specific treatment found but it's a disease
    if is_disease_detected(disease_class):
        return "Consult with agricultural expert for specific treatment recommendations. Isolate affected plants and maintain proper sanitation."
    
    return "No treatment needed - plant is healthy. Continue regular maintenance."
# Additional endpoint to check model status
@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "success": True,
        "model_loaded": model is not None,
        "classes_count": NUM_CLASSES,
        "classes": CLASS_NAMES,
        "device": str(device)
    })

# ====================================================================
# CORS HANDLING
# ====================================================================

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# ====================================================================
# MAIN ENTRY POINT
# ====================================================================

if __name__ == "__main__":
    print(f"🚀 Flask ML API starting on http://0.0.0.0:5001")
    print(f"📁 Model status: {'Loaded' if model else 'Not loaded'}")
    print(f"🌿 Classes available: {NUM_CLASSES}")
    app.run(host="0.0.0.0", port=5001, debug=True)