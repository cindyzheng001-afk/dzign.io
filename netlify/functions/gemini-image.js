// netlify/functions/gemini-image.js
// Handles image generation for your interior design app

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  
    try {
      const { image, prompt } = JSON.parse(event.body);
  
      if (!image || !prompt) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Image and prompt are required' })
        };
      }
  
      // Get API key from Netlify environment variable
      const API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;
  
      if (!API_KEY) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'API key not configured' })
        };
      }
  
      // Extract base64 data (remove data URL prefix if present)
      const base64Data = image.includes(',') ? image.split(',')[1] :  image;
      const mimeType = image.includes('data:') 
        ? image.split(';')[0].split(':')[1] 
        : 'image/jpeg';
  
      // Make request to Gemini API for image generation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                },
                { text: prompt }
              ]
            }],
            generationConfig: {
              temperature: 0.2
            }
          })
        }
      );
  
      const data = await response.json();
  
      // Check for API errors
      if (!response.ok) {
        console.error('Gemini API Error:', data);
        
        // Handle specific error types
        const errorMessage = data.error?.message || 'API request failed';
        if (response.status === 429) {
          return {
            statusCode: 429,
            body: JSON.stringify({ 
              error: 'Rate limit exceeded. Please wait a moment and try again.',
              retryable: true
            })
          };
        }
        
        if (response.status === 503) {
          return {
            statusCode: 503,
            body: JSON.stringify({ 
              error: 'Service temporarily overloaded. Please try again.',
              retryable: true
            })
          };
        }
  
        return {
          statusCode: response.status,
          body: JSON.stringify({ 
            error: errorMessage,
            details: data
          })
        };
      }
  
      // Return the full response (your frontend will extract the image)
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      };
  
    } catch (error) {
      console.error('Function error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Internal server error',
          message: error.message 
        })
      };
    }
  };