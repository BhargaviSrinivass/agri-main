import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim import lr_scheduler
from torchvision import models, transforms, datasets
from torch.utils.data import DataLoader, random_split
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import time
import os
import copy

# ====================================================================
# CONFIGURATION
# ====================================================================

# *** IMPORTANT: SET THIS PATH ***
# This path should be RELATIVE or ABSOLUTE to the folder containing your disease classes.
DATA_DIR = r'D:\Projects\Hackshetra1.0\hackkshetra1.0\agri-main\ml-service\plant_disease_data'
MODEL_SAVE_PATH = 'resnet50_crop_disease_best.pth'
NUM_EPOCHS = 25
BATCH_SIZE = 32
LEARNING_RATE = 0.001
FREEZE_LAYERS = True
VALIDATION_SPLIT_RATIO = 0.2 # 20% of the data for validation

# ImageNet statistics for normalization
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Set device
# Uses GPU (cuda) if available, otherwise uses CPU
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# ====================================================================
# DATA LOADING AND SPLIT
# ====================================================================

# Data augmentation for training, simple transform for validation
data_transforms = {
    'train': transforms.Compose([
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)
    ]),
    'val': transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)
    ]),
}

print("\nLoading dataset and performing Train/Validation split...")
# Load the entire dataset using the training transformation initially
full_dataset = datasets.ImageFolder(DATA_DIR, data_transforms['train'])

# Determine split sizes
total_size = len(full_dataset)
val_size = int(VALIDATION_SPLIT_RATIO * total_size)
train_size = total_size - val_size

# Randomly split the dataset
train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

# Apply the specific 'val' transformation to the validation subset
# We access the underlying ImageFolder object for the transform
val_dataset.dataset.transform = data_transforms['val']

image_datasets = {'train': train_dataset, 'val': val_dataset}

# Dynamic calculation of classes
NUM_CLASSES = len(full_dataset.classes)
CLASS_NAMES = full_dataset.classes

print(f"Detected **{NUM_CLASSES}** classes dynamically.")
print(f"Example Class Names: {CLASS_NAMES[:3]}...")

# Create DataLoaders
dataloaders = {
    # Use num_workers=0 if you encounter issues on Windows or local setups
    'train': DataLoader(image_datasets['train'], batch_size=BATCH_SIZE, shuffle=True, num_workers=4),
    'val': DataLoader(image_datasets['val'], batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
}

dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val']}
print(f"Training samples: {dataset_sizes['train']}, Validation samples: {dataset_sizes['val']}")

# ====================================================================
# MODEL SETUP AND OPTIMIZATION
# ====================================================================

print("\nInitializing ResNet-50 model...")
model_ft = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)

if FREEZE_LAYERS:
    # Freeze all layers first
    for param in model_ft.parameters():
        param.requires_grad = False

    # Unfreeze the last two convolutional blocks (layer4 and layer3) for fine-tuning
    print("Fine-tuning: Unfreezing layer4, layer3, and the final FC layer.")
    for param in model_ft.layer4.parameters():
        param.requires_grad = True
    for param in model_ft.layer3.parameters():
        param.requires_grad = True

# Replace the final fully connected layer
num_ftrs = model_ft.fc.in_features
model_ft.fc = nn.Linear(num_ftrs, NUM_CLASSES)

model_ft = model_ft.to(device)

# Only optimize parameters that are set to requires_grad=True
params_to_update = [param for param in model_ft.parameters() if param.requires_grad]
print(f"Total trainable parameters: {sum(p.numel() for p in params_to_update):,}")

optimizer_ft = optim.Adam(params_to_update, lr=LEARNING_RATE)
criterion = nn.CrossEntropyLoss()
exp_lr_scheduler = lr_scheduler.StepLR(optimizer_ft, step_size=7, gamma=0.1)

print("Model and Optimization setup complete.")

# ====================================================================
# TRAINING LOOP
# ====================================================================

def train_model(model, criterion, optimizer, scheduler, num_epochs=NUM_EPOCHS):
    since = time.time()
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    for epoch in range(num_epochs):
        print(f'\nEpoch {epoch+1}/{num_epochs}')
        print('-' * 20)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            if phase == 'train':
                scheduler.step()

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

            # Save best model
            if phase == 'val' and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())
                torch.save(best_model_wts, MODEL_SAVE_PATH)
                print(f"New best model saved to {MODEL_SAVE_PATH} with Acc: {best_acc:.4f}")

    time_elapsed = time.time() - since
    print(f'\nTraining complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s')
    print(f'Best val Acc: {best_acc:.4f}')

    model.load_state_dict(best_model_wts)
    return model

# --- EXECUTE TRAINING ---
if __name__ == '__main__':
    model_ft = train_model(model_ft, criterion, optimizer_ft, exp_lr_scheduler, num_epochs=NUM_EPOCHS)
    
    print("\n--- Training Completed ---")
    print(f"Best model weights are saved at: {MODEL_SAVE_PATH}")
    print("You can now use the prediction function below with your saved model.")
    
# ====================================================================
# INFERENCE FUNCTION (Prediction)
# ====================================================================

def predict_image(model, image_path, class_names, device):
    """Predicts the class of a single image using the trained model."""
    if not os.path.exists(image_path):
        print(f"Error: Image path not found at {image_path}")
        return

    image = Image.open(image_path).convert('RGB')
    
    # Transformation for inference
    inference_transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)
    ])

    input_tensor = inference_transform(image).unsqueeze(0).to(device)
    
    model.eval()
    
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        _, predicted_index = torch.max(outputs, 1)

    predicted_class = class_names[predicted_index.item()]
    confidence = probabilities[0, predicted_index.item()].item() * 100
    
    print(f"\n--- Inference Result ---")
    print(f"Image: {os.path.basename(image_path)}")
    print(f"Predicted Class: **{predicted_class}**")
    print(f"Confidence: {confidence:.2f}%")
    
    plt.figure(figsize=(6, 6))
    plt.imshow(image)
    plt.title(f"Prediction: {predicted_class} ({confidence:.1f}%)")
    plt.axis("off")
    plt.show()

