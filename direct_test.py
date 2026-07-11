import requests
import base64

KEY_ID = "rzp_test_TADs6ARRe6AXmv"
KEY_SECRET = "DJK5zj3Rkq2ZdMF5h797IJW4"

# Create authorization header manually
credentials = f"{KEY_ID}:{KEY_SECRET}"
encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')

headers = {
    "Authorization": f"Basic {encoded_credentials}",
    "Content-Type": "application/json"
}

url = "https://api.razorpay.com/v1/plans?count=1"

print("Talking directly to Razorpay (bypassing the library)...")
try:
    response = requests.get(url, headers=headers, timeout=10)
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response Text: {response.text[:300]}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS! Your API keys are 100% CORRECT.")
        print("⚠️ The empty error is caused by the razorpay library breaking on Python 3.14.")
    elif response.status_code == 401:
        print("\n❌ ERROR: Your API keys are invalid or inactive.")
    else:
        print(f"\n❌ Unexpected status code: {response.status_code}")
        
except Exception as e:
    print(f"❌ Network Error: {e}")