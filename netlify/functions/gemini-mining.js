// netlify/functions/gemini-mining.js
// Handles furniture and color palette extraction

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
  
      // Extract base64 data
      const base64Data = image.includes(',') ? image.split(',')[1] : image;
      const mimeType = image.includes('data:') 
        ? image.split(';')[0].split(':')[1] 
        : 'image/jpeg';
  
      // Define the JSON schema for structured output
      const responseSchema = {
        type: "object",
        properties: {
          furniture: {
            type: "array",
            items: {
              type: "object",
              properties: {
                itemName: { type: "string" },
                color: { type: "string" },
                searchQuery: { type: "string" }
              },
              required: ["itemName", "color", "searchQuery"]
            }
          },
          palette: {
            type: "array",
            items: {
              type: "object",
              properties: {
                hex: { type: "string" },
                name: { type: "string" }
              },
              required: ["hex", "name"]
            }
          }
        },
        required: ["furniture", "palette"]
      };
  
      // Make request to Gemini for structured JSON mining
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
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
              responseMimeType: "application/json",
              responseSchema: responseSchema
            }
          })
        }
      );
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error('Gemini Mining API Error:', data);
        
        // Handle rate limits gracefully
        if (response.status === 429 || response.status === 503) {
          return {
            statusCode: response.status,
            body: JSON.stringify({ 
              error: 'Service temporarily busy. Returning empty results.',
              retryable: true,
              furniture: [],
              palette: []
            })
          };
        }
  
        return {
          statusCode: response.status,
          body: JSON.stringify({ 
            error: data.error?.message || 'Mining request failed',
            furniture: [],
            palette: []
          })
        };
      }
  
      // Return the full response
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      };
  
    } catch (error) {
      console.error('Mining function error:', error);
      // Return empty results instead of failing
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({ furniture: [], palette: [] })
              }]
            }
          }]
        })
      };
    }
  };