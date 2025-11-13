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
from torchvision import transforms, datasets
# Import EfficientNet modules for model loading
from torchvision.models import efficientnet_b4, EfficientNet_B4_Weights 

# ====================================================================
# FLASK APP SETUP
# ====================================================================

app = Flask(__name__)
CORS(app)  # ✅ Allow all origins for development

# ====================================================================
# CONFIGURATION
# ====================================================================

# Ensure these paths are correct for your environment!
DATA_DIR = r'D:\Projects\Hackshetra1.0\hackkshetra1.0\agri-main\ml-service\livestock_data' 
MODEL_SAVE_PATH = r"D:\Projects\Hackshetra1.0\hackkshetra1.0\agri-main\efficientnet_cattle_disease_best.pth"
API_PORT = 5002 

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

# ====================================================================
# LOAD CLASS NAMES DYNAMICALLY
# ====================================================================

CLASS_NAMES = []
NUM_CLASSES = 0

if os.path.exists(DATA_DIR):
    try:
        dataset = datasets.ImageFolder(DATA_DIR)
        CLASS_NAMES = dataset.classes
        NUM_CLASSES = len(CLASS_NAMES)
        print(f"✅ Loaded {NUM_CLASSES} classes dynamically: {CLASS_NAMES}")
    except Exception as e:
        print(f"⚠️ Error loading dataset classes: {e}")
else:
    print("⚠️ Warning: Dataset folder not found. Cannot determine classes.")

# ====================================================================
# MODEL LOADING
# ====================================================================

def load_model(path):
    if NUM_CLASSES == 0:
        print("❌ Cannot load model: Class count is zero.")
        return None
    try:
        print("Loading EfficientNet-B4 structure...")
        model = efficientnet_b4(weights=None) 
        
        num_ftrs = model.classifier[-1].in_features
        model.classifier[-1] = nn.Linear(num_ftrs, NUM_CLASSES)
        
        if os.path.exists(path):
            model.load_state_dict(torch.load(path, map_location=device))
            print(f"✅ Cattle Model loaded successfully from {path}")
        else:
            print("⚠️ No saved cattle model found. Prediction will fail.")
            
        model.to(device)
        model.eval()
        return model
    except Exception as e:
        print(f"❌ Error loading cattle model: {e}")
        return None

# Load the model once at startup
model = load_model(MODEL_SAVE_PATH)

# ====================================================================
# HELPER FUNCTIONS
# ====================================================================

def allowed_file(filename):
    allowed_extensions = {"png", "jpg", "jpeg", "gif"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions

def is_disease_detected(class_name):
    class_lower = class_name.lower()
    
    if 'healthy' in class_lower or 'normal' in class_lower:
        return False
    
    disease_indicators = ['lumpy', 'mastitis', 'foot-and-mouth']
    for indicator in disease_indicators:
        if indicator in class_lower:
            return True
    
    return False

def format_disease_name(class_name):
    formatted = class_name.replace('__', ' ').replace('_', ' ').replace('-', ' ')
    formatted = ' '.join(word.capitalize() for word in formatted.split())
    return formatted

def get_treatment_recommendation(disease_class):
    """Treatment recommendations for cattle diseases"""
    class_lower = disease_class.lower()
    
    treatments = {
        "lumpy": "Isolate the affected animal. Provide supportive care and pain relief. Consult a veterinarian immediately.",
        "mastitis": "Administer antibiotics (as prescribed by a vet) and strip the udder frequently. Improve sanitation and bedding.",
        "foot-and-mouth": "Quarantine the animal immediately. Provide soft food and clean, cool water. Follow local veterinary guidelines for managing outbreaks.",
    }
    
    for key, treatment in treatments.items():
        if key in class_lower:
            return treatment
    
    if is_disease_detected(disease_class):
        return "Consult with a veterinarian or agricultural expert for specific treatment recommendations."
    
    # FIX: Add the final return statement for healthy/normal cases
    return "No treatment needed - animal is healthy. Continue regular maintenance."


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
        "message": "Cattle Disease Detection API is running!",
        "model_status": "Loaded" if model else "Not Loaded",
        "classes_loaded": NUM_CLASSES,
        "api_port": API_PORT
    })

@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({
            "success": False, 
            "message": "Model is not loaded. Check model file path and class data."
        }), 503

    if "image" not in request.files:
        return jsonify({
            "success": False, 
            "message": "No image file uploaded"
        }), 400

    file = request.files["image"]
    
    if file and allowed_file(file.filename):
        try:
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
            
            detected = is_disease_detected(predicted_class)
            formatted_disease = format_disease_name(predicted_class)
            
            # Generate appropriate message and treatment
            if detected:
                message = f"Disease detected: {formatted_disease}"
                treatment = get_treatment_recommendation(predicted_class)
            else:
                message = f"Animal is healthy: {formatted_disease}"
                # Call helper function to get the 'healthy' treatment
                treatment = get_treatment_recommendation(predicted_class) 

            return jsonify({
                "success": True,
                "message": message,
                "detection": {
                    "detected": detected,
                    "disease": formatted_disease,
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

# ====================================================================
# MAIN ENTRY POINT
# ====================================================================

if __name__ == "__main__":
    # Check if the model loaded successfully before starting the server
    print(f"📁 Model status: {'Loaded' if model else 'Not loaded'}")
    print(f"🌿 Classes available: {NUM_CLASSES}")
    
    print(f"🚀 Flask ML API (Cattle) starting on http://0.0.0.0:{API_PORT}")
    app.run(host="0.0.0.0", port=API_PORT, debug=True)