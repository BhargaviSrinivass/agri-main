# telegram_bot.py

# ====================================================================
# IMPORTS
# ====================================================================

import os
import requests
import io
import logging

from telegram import Update, File
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from telegram.request import HTTPXRequest

# ====================================================================
# CONFIGURATION
# ====================================================================

# ⚠️ IMPORTANT: Replace 'YOUR_BOT_TOKEN' with the token from BotFather
BOT_TOKEN = "8386789214:AAH0XlRs7EDDkHynP97ewnTqo5vHHV973jc" 

# This should match the host and port in your app.py (http://0.0.0.0:5001)
FLASK_API_URL = "http://127.0.0.1:5001/predict" 

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)
logger = logging.getLogger(__name__)

# ====================================================================
# TELEGRAM HANDLERS
# ====================================================================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sends a welcome message when the command /start is issued."""
    user = update.effective_user
    await update.message.reply_html(
        f"Hi {user.mention_html()}! 👋\n\nI am a crop disease detection bot. Please send me a clear picture of a crop leaf, and I will try to predict if it has a disease and recommend a treatment.",
    )

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles incoming photos, sends them to the ML API, and sends the result back."""
    logger.info("Received photo from user %s", update.effective_user.id)
    
    # Send a waiting message
    await update.message.reply_text("Analyzing image... Please wait a moment.")
    
    try:
        # 1. Get the largest photo file
        photo_file_id = update.message.photo[-1].file_id
        
        # 2. Get the actual file object from Telegram
        photo_file: File = await context.bot.get_file(photo_file_id)
        
        # 3. CORRECTED: Download the file content as bytearray and convert to bytes
        file_bytearray = await photo_file.download_as_bytearray()
        file_bytes = bytes(file_bytearray)  # Convert bytearray to bytes
        
        # 4. Prepare the file for the Flask API request
        files = {
            'image': ('image.jpg', file_bytes, 'image/jpeg')
        }
        
        # 5. Send the request to your running Flask ML service
        logger.info("Sending image to ML API at %s", FLASK_API_URL)
        response = requests.post(FLASK_API_URL, files=files)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        
        # 6. Parse the JSON response
        prediction_data = response.json()
        
        if prediction_data['success']:
            detection = prediction_data['detection']
            disease = detection['disease']
            confidence = detection['confidence'] * 100
            treatment = detection['treatment']

            # 7. Format the final message for the user
            confidence_str = f"{confidence:.2f}%"

            if detection['detected']:
                result_message = (
                    f"**🌿 Disease Detection Result 🌿**\n\n"
                    f"**Detected Disease:** {disease}\n"
                    f"**Confidence:** {confidence_str}\n\n"
                    f"**Treatment Recommendation:**\n"
                    f"_{treatment}_"
                )
            else:
                result_message = (
                    f"**✅ Plant Status: Healthy ✅**\n\n"
                    f"**Confidence:** {confidence_str}\n\n"
                    f"**Recommendation:**\n"
                    f"_{treatment}_"
                )
            
            await update.message.reply_text(result_message, parse_mode='Markdown')

        else:
            await update.message.reply_text(f"❌ Prediction failed in the backend: {prediction_data.get('message', 'Unknown error')}")

    except requests.exceptions.ConnectionError:
        # This catches errors if the Flask API is not running
        await update.message.reply_text("⚠️ **Error:** Could not connect to the ML service. Please ensure the Flask API is running at the correct address (http://127.0.0.1:5001).")
    except Exception as e:
        logger.error("An error occurred during prediction: %s", str(e), exc_info=True)
        await update.message.reply_text(f"❌ An unexpected error occurred: {str(e)}")

# ====================================================================
# MAIN FUNCTION (CORRECTED VERSION)
# ====================================================================

def main() -> None:
    """Start the bot."""
    
    # Create the Application with custom request configuration
    application = Application.builder() \
        .token(BOT_TOKEN) \
        .request(HTTPXRequest(connect_timeout=20.0, read_timeout=30.0)) \
        .build()

    # Add handlers
    application.add_handler(CommandHandler("start", start))
    
    # Corrected filter for modern telegram library
    application.add_handler(MessageHandler(filters.PHOTO & filters.ChatType.PRIVATE, handle_photo)) 

    # Run the bot
    logger.info("🤖 Telegram Bot started. Press Ctrl-C to stop.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()