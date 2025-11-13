import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim import lr_scheduler
from torchvision import models, transforms, datasets
from torchvision.models import efficientnet_b4, EfficientNet_B4_Weights
from torch.utils.data import DataLoader, random_split
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import time
import os
import copy

# ====================================================================
# CONFIGURATION FOR PHASE 2: FULL FINE-TUNING
# ====================================================================

# Set to your absolute path
DATA_DIR = r'D:\Projects\Hackshetra1.0\hackkshetra1.0\agri-main\ml-service\livestock_data' 
MODEL_SAVE_PATH = 'efficientnet_cattle_disease_best.pth'
NUM_EPOCHS = 30  # Increased epochs for better accuracy in fine-tuning
BATCH_SIZE = 8
LEARNING_RATE = 0.00001 # CRUCIAL: Very low learning rate for fine-tuning
FREEZE_LAYERS = False   # CRUCIAL: Unfreeze all layers
VALIDATION_SPLIT_RATIO = 0.2 # FIX: This variable was missing, causing NameError

# ImageNet statistics for normalization
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Set device
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# ====================================================================
# DATA LOADING AND SPLIT
# ====================================================================

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
# Ensure the ImageFolder path is correct
full_dataset = datasets.ImageFolder(DATA_DIR, data_transforms['train'])

total_size = len(full_dataset)
val_size = int(VALIDATION_SPLIT_RATIO * total_size) # This line is now safe
train_size = total_size - val_size

train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
val_dataset.dataset.transform = data_transforms['val']

image_datasets = {'train': train_dataset, 'val': val_dataset}

NUM_CLASSES = len(full_dataset.classes)
CLASS_NAMES = full_dataset.classes

print(f"Detected **{NUM_CLASSES}** classes dynamically: {CLASS_NAMES}")

dataloaders = {
    'train': DataLoader(image_datasets['train'], batch_size=BATCH_SIZE, shuffle=True, num_workers=4),
    'val': DataLoader(image_datasets['val'], batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
}

dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val']}
print(f"Training samples: {dataset_sizes['train']}, Validation samples: {dataset_sizes['val']}")

# ====================================================================
# MODEL SETUP AND OPTIMIZATION (EfficientNet-B4)
# ====================================================================

print("\nInitializing EfficientNet-B4 model...")
model_ft = efficientnet_b4(weights=EfficientNet_B4_Weights.IMAGENET1K_V1)

if FREEZE_LAYERS: 
    for param in model_ft.parameters():
        param.requires_grad = False
    print("Fine-tuning: Unfreezing the final classification layer.")
    for param in model_ft.classifier.parameters():
        param.requires_grad = True
else: # This path is executed for the full fine-tuning run
    for param in model_ft.parameters():
        param.requires_grad = True
    print("Fine-tuning: ALL layers are unfrozen for continued training.")


# Replace the final fully connected layer
num_ftrs = model_ft.classifier[-1].in_features
model_ft.classifier[-1] = nn.Linear(num_ftrs, NUM_CLASSES)

# *** LOAD THE BEST WEIGHTS FROM PREVIOUS RUN ***
try:
    if os.path.exists(MODEL_SAVE_PATH):
        model_ft.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location=device))
        print(f"✅ Loaded previous best model weights ({MODEL_SAVE_PATH}) to continue training.")
    else:
        print("⚠️ Saved model not found. Starting from ImageNet pre-trained weights.")
except Exception as e:
    print(f"❌ Error loading saved model weights: {e}")

model_ft = model_ft.to(device)

params_to_update = [param for param in model_ft.parameters() if param.requires_grad]
print(f"Total trainable parameters: {sum(p.numel() for p in params_to_update):,}")

# Optimizer uses the new, low LEARNING_RATE
optimizer_ft = optim.Adam(params_to_update, lr=LEARNING_RATE)
criterion = nn.CrossEntropyLoss() 
exp_lr_scheduler = lr_scheduler.StepLR(optimizer_ft, step_size=7, gamma=0.1)

print("Model and Optimization setup complete.")

# ====================================================================
# PLOTTING FUNCTION
# ====================================================================

def plot_history(train_history, val_history, metric='accuracy'):
    """Plots training and validation history for a given metric."""
    plt.figure(figsize=(10, 5))
    plt.title(f"{metric.capitalize()} vs. Epochs")
    plt.xlabel("Training Epochs")
    plt.ylabel(metric.capitalize())
    plt.plot(train_history, label=f"Train {metric}")
    plt.plot(val_history, label=f"Validation {metric}")
    plt.legend()
    plt.grid(True)
    plt.savefig(f'{metric}_history_finetune.png') 
    plt.close() 
    print(f"\nSaved {metric} history plot to {metric}_history_finetune.png")

# ====================================================================
# TRAINING LOOP
# ====================================================================

def train_model(model, criterion, optimizer, scheduler, num_epochs=NUM_EPOCHS):
    since = time.time()
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    train_loss_history = []
    val_loss_history = []
    train_acc_history = []
    val_acc_history = []

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

            # Record history
            if phase == 'train':
                train_loss_history.append(epoch_loss)
                train_acc_history.append(epoch_acc.item())
            else:
                val_loss_history.append(epoch_loss)
                val_acc_history.append(epoch_acc.item())


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
    return model, train_acc_history, val_acc_history, train_loss_history, val_loss_history

# --- EXECUTE TRAINING ---
if __name__ == '__main__':
    model_ft, train_acc, val_acc, train_loss, val_loss = train_model(model_ft, criterion, optimizer_ft, exp_lr_scheduler, num_epochs=NUM_EPOCHS)
    
    # Plotting the results
    plot_history(train_acc, val_acc, metric='accuracy')
    plot_history(train_loss, val_loss, metric='loss')
    
    print("\n--- Training Completed ---")
    print(f"Best model weights are saved at: {MODEL_SAVE_PATH}")
    print("Next: Rerun the Flask API (app_cattle.py) to load the newly optimized model!")