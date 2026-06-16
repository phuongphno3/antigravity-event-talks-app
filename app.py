import os
import re
import html
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cached_releases = None

def strip_tags(html_text):
    """Strip HTML tags and unescape HTML entities to get clean plain text."""
    # Replace some elements with space to avoid joining words
    text = re.sub(r'</?(p|h3|li|ul|ol|div|br)/?>', ' ', html_text)
    text = re.sub(r'<[^<]+?>', '', text)
    text = html.unescape(text)
    return ' '.join(text.split())

def generate_tweet_text(date, update_type, plain_text):
    """Generate a Tweet text within 280 characters including tags."""
    prefix = f"BigQuery [{update_type}] ({date}): "
    suffix = " #BigQuery #GoogleCloud"
    # Max length of text is 280 characters.
    max_body_len = 280 - len(prefix) - len(suffix) - 3  # 3 for "..."
    
    if len(plain_text) > max_body_len:
        # Truncate at word boundary if possible
        body_text = plain_text[:max_body_len]
        if ' ' in body_text:
            body_text = body_text.rsplit(' ', 1)[0]
        body = body_text + "..."
    else:
        body = plain_text
        
    return f"{prefix}{body}{suffix}"

def parse_release_notes():
    """Fetch and parse the BigQuery XML feed into structured JSON."""
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(FEED_URL, headers=headers)
    
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    update_id_counter = 1
    
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        date_text = title.text.strip() if title is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', ns)
        updated_iso = updated.text.strip() if updated is not None else ""
        
        content_el = entry.find('atom:content', ns)
        content_html = content_el.text if content_el is not None else ""
        
        link_el = entry.find('atom:link', ns)
        link_href = link_el.attrib.get('href', '') if link_el is not None else FEED_URL
        
        # Parse out specific updates from the HTML content
        # Updates are typically structured as <h3>Type</h3> followed by paragraphs/lists
        # We split by <h3> tags
        pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL | re.IGNORECASE)
        matches = pattern.findall(content_html)
        
        entry_updates = []
        for type_tag, body in matches:
            type_tag = type_tag.strip()
            body_html = body.strip()
            plain_text = strip_tags(body_html)
            tweet_text = generate_tweet_text(date_text, type_tag, plain_text)
            
            entry_updates.append({
                'id': f"up-{update_id_counter}",
                'type': type_tag,
                'body': body_html,
                'plain_text': plain_text,
                'tweet_text': tweet_text
            })
            update_id_counter += 1
            
        # If no <h3> was found, treat the whole content as one update
        if not entry_updates and content_html.strip():
            plain_text = strip_tags(content_html)
            tweet_text = generate_tweet_text(date_text, "Update", plain_text)
            entry_updates.append({
                'id': f"up-{update_id_counter}",
                'type': "Update",
                'body': content_html.strip(),
                'plain_text': plain_text,
                'tweet_text': tweet_text
            })
            update_id_counter += 1
            
        entries.append({
            'date': date_text,
            'updated_iso': updated_iso,
            'link': link_href,
            'updates': entry_updates
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    global cached_releases
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if cached_releases is None or force_refresh:
        try:
            cached_releases = parse_release_notes()
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    return jsonify({'releases': cached_releases})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
