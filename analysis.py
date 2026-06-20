import os
import json
import pandas as pd
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer

# Download VADER lexicon
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    nltk.download('vader_lexicon')


sia = SentimentIntensityAnalyzer()

platforms = ['yt', 'ig'] 
human_indices = [1, 2, 3]
ai_indices = [4, 5, 6]
all_indices = human_indices + ai_indices

# Defined list of audit keywords to calculate the Skepticism Index
AUDIT_KEYWORDS = ['bot', 'fake', 'cgi', 'ai', 'uncanny', 'creepy', 'virtual', 'avatar', 'synthesized', 'robot']

def extract_comment_text(comment_obj, platform):
    """Safely extracts raw comment text based on platform-specific JSON keys."""
    if not isinstance(comment_obj, dict):
        return ""
    
    if platform == 'ig':
        return str(comment_obj.get('text', ''))
    elif platform == 'yt':
        return str(comment_obj.get('comment', ''))
    else:
        # Default fallback for TikTok or other layouts
        return str(comment_obj.get('text', comment_obj.get('comment', '')))

def calculate_metrics(comments_list, platform):
    """Processes comments list to calculate sentiment scores and skepticism metrics."""
    if not comments_list or not isinstance(comments_list, list):
        return 0.0, 0.0
    
    total_compound = 0.0
    skeptical_count = 0
    valid_comments = 0
    
    for item in comments_list:
        text = extract_comment_text(item, platform).strip()
        if not text:
            continue
            
        valid_comments += 1
        
        # 1. Sentiment Score calculation
        score = sia.polarity_scores(text)
        total_compound += score['compound']
        
        # 2. Skepticism Index calculation
        text_lower = text.lower()
        if any(keyword in text_lower for keyword in AUDIT_KEYWORDS):
            skeptical_count += 1
            
    if valid_comments == 0:
        return 0.0, 0.0
        
    avg_sentiment = total_compound / valid_comments
    skepticism_pct = (skeptical_count / valid_comments) * 100
    
    return round(avg_sentiment, 4), round(skepticism_pct, 2)

def main():
    processed_records = []

    print("🚀 Starting Data Audit Pipeline (Multi-Platform Keys Enabled)...")

    for platform in platforms:
        for num in all_indices:
            gen_file = f"{platform}{num}.1.json"
            com_file = f"{platform}{num}.2.json"
            
            if os.path.exists(gen_file) and os.path.exists(com_file):
                # Load General Metadata File
                with open(gen_file, 'r', encoding='utf-8') as f:
                    gen_json = json.load(f)
                    
                # Load Comments File
                with open(com_file, 'r', encoding='utf-8') as f:
                    com_json = json.load(f)
                
                # Check for empty lists safely
                if not gen_json or not isinstance(gen_json, list):
                    print(f"⚠️ Empty or invalid format in {gen_file}, skipping...")
                    continue
                    
                # Extract the first item object from the array
                general_data = gen_json[0]
                
                # Classify creator type
                creator_type = "Human" if num in human_indices else "AI"
                
                # Extract Platform specific metrics dynamically
                if platform == 'ig':
                    views = int(general_data.get('videoViewCount', 0))
                    likes = int(general_data.get('likesCount', 0))
                    comments_count = int(general_data.get('commentsCount', 0))
                    title = f"Instagram Post {num}"
                    platform_label = "Instagram"
                elif platform == 'yt':
                    views = int(general_data.get('viewCount', 0))
                    likes = int(general_data.get('likes', 0))
                    comments_count = int(general_data.get('commentsCount', 0))
                    title = general_data.get('title', f"YouTube Video {num}")
                    platform_label = "YouTube"
                else:
                    # Default parsing schema fallback (e.g. for TikTok)
                    views = int(general_data.get('views', general_data.get('viewCount', 0)))
                    likes = int(general_data.get('likes', general_data.get('likeCount', 0)))
                    comments_count = int(general_data.get('commentsCount', general_data.get('comments', 0)))
                    title = general_data.get('title', f"TikTok Video {num}")
                    platform_label = "TikTok"

                engagement_rate = ((likes + comments_count) / views * 100) if views > 0 else 0.0
                comment_velocity = (comments_count / views * 100) if views > 0 else 0.0
                
                # Run the targeted qualitative NLP evaluation functions
                avg_sentiment, skepticism_index = calculate_metrics(com_json, platform)
                
                record = {
                    "file_id": f"{platform}{num}",
                    "platform": platform_label,
                    "creator_type": creator_type,
                    "title": title,
                    "views": views,
                    "likes": likes,
                    "comments_count": comments_count,
                    "engagement_rate_pct": round(engagement_rate, 2),
                    "comment_velocity_pct": round(comment_velocity, 2),
                    "sentiment_score": avg_sentiment,
                    "skepticism_index_pct": skepticism_index
                }
                
                processed_records.append(record)
                print(f"✅ Successfully audited {platform}{num} ({creator_type})")
            else:
                # Silently skip if files aren't available yet
                pass

    if not processed_records:
        print("❌ No matching json files found. Ensure naming matches layout (e.g., ig1.1.json).")
        return

    # Export compilations
    df = pd.DataFrame(processed_records)
    df.to_csv("dashboard_metrics.csv", index=False)
    
    with open("dashboard_metrics.json", "w", encoding="utf-8") as json_out:
        json.dump(processed_records, json_out, indent=4, ensure_ascii=False)

    print("\n🎉 Pipeline Complete! Created 'dashboard_metrics.json' and 'dashboard_metrics.csv'")
    print(df[['file_id', 'platform', 'creator_type', 'engagement_rate_pct', 'sentiment_score', 'skepticism_index_pct']])

if __name__ == "__main__":
    main()