# backend/app.py
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'message': 'Python backend is running!'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)