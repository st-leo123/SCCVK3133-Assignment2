import os
import json
import pandas as pd

# Configuration based on your setup
platforms = ['yt', 'ig']  # YouTube and Instagram
indices = [1, 2, 3, 4, 5, 6] # 1-3 Human, 4-6 AI

def extract_comment_text(comment_obj, platform):
    """Safely extracts raw comment text based on platform-specific JSON keys."""
    if not isinstance(comment_obj, dict):
        return ""
    if platform == 'ig':
        return str(comment_obj.get('text', ''))
    elif platform == 'yt':
        return str(comment_obj.get('comment', ''))
    return ""

def main():
    print("🚀 Starting Raw Data Merger...")
    all_rows = []

    for platform in platforms:
        for num in indices:
            gen_file = f"{platform}{num}.1.json"
            com_file = f"{platform}{num}.2.json"
            
            if os.path.exists(gen_file) and os.path.exists(com_file):
                # Load the files
                with open(gen_file, 'r', encoding='utf-8') as f:
                    gen_json = json.load(f)
                with open(com_file, 'r', encoding='utf-8') as f:
                    com_json = json.load(f)
                
                # Failsafe for empty data
                if not gen_json or not isinstance(gen_json, list):
                    continue
                    
                general_data = gen_json[0]
                creator_type = "Human" if num <= 3 else "AI"
                platform_label = "Instagram" if platform == 'ig' else "YouTube"
                
                # Standardize keys
                if platform == 'ig':
                    views = int(general_data.get('videoViewCount', 0))
                    likes = int(general_data.get('likesCount', 0))
                    comments_count = int(general_data.get('commentsCount', 0))
                else:
                    views = int(general_data.get('viewCount', 0))
                    likes = int(general_data.get('likes', 0))
                    comments_count = int(general_data.get('commentsCount', 0))

                # Create a row for EVERY single comment
                if isinstance(com_json, list):
                    for item in com_json:
                        raw_text = extract_comment_text(item, platform)
                        if not raw_text.strip():
                            continue
                            
                        # Clean up text so it doesn't break Excel rows (remove newlines)
                        clean_text = raw_text.replace('\n', ' ').replace('\r', ' ').strip()
                        
                        all_rows.append({
                            "Video_ID": f"{platform}{num}",
                            "Platform": platform_label,
                            "Creator_Type": creator_type,
                            "Video_Views": views,
                            "Video_Likes": likes,
                            "Total_Comments": comments_count,
                            "Raw_Comment_Text": clean_text
                        })
                print(f"✅ Merged data from {platform}{num}")
            else:
                pass

    if not all_rows:
        print("❌ No matching json files found.")
        return

    # Convert to DataFrame
    df = pd.DataFrame(all_rows)
    
    # Export to CSV with utf-8-sig so Excel automatically reads emojis and special characters correctly!
    output_filename = "master_raw_data.csv"
    df.to_csv(output_filename, index=False, encoding='utf-8-sig')

    print(f"\n🎉 Success! Created '{output_filename}' with {len(df)} rows.")

if __name__ == "__main__":
    main()