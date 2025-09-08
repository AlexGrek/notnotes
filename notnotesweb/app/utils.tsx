/**
 * A utility function to store the bearer token in localStorage.
 * This token can then be retrieved by other functions, such as `authFetch`,
 * for making authenticated API requests.
 *
 * @param token The bearer token string to be stored.
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('nn-bearerToken', token);
};


/**
 * A utility function for making authenticated API requests with optional body and method.
 * It retrieves the bearer token from localStorage and merges any
 * additional headers and options provided by the caller.
 *
 * @param url The URL for the API request.
 * @param options The RequestInit object for the fetch call, including method and body.
 * @returns A Promise that resolves to the Response object.
 */
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Retrieve the bearer token from localStorage.
  const token = localStorage.getItem('nn-bearerToken');

  // If no token is found, throw an error to halt the process.
  if (!token) {
    throw new Error('No bearer token found in localStorage. Please ensure a token is set before making an authenticated request.');
  }

  // Define the default headers.
  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Merge the user-provided headers with the default headers.
  // The user-provided headers will override the default ones if there is a conflict.
  const mergedHeaders = {
    ...defaultHeaders,
    ...(options.headers || {}), // Merge user-provided headers
  };

  // Perform the fetch call with the combined options.
  // We're creating a new options object to ensure the headers are properly merged.
  return fetch(url, {
    ...options, // Spread all other options (like method, body, etc.)
    headers: mergedHeaders,
  });
};

// Example usage:
// This example assumes you have a token stored in localStorage.
// localStorage.setItem('nn-bearerToken', 'your_actual_token_here');

// Example of a GET request
// authFetch('https://api.example.com/data')
//   .then(response => response.json())
//   .then(data => console.log('Data:', data))
//   .catch(error => console.error('Fetch error:', error));

// Example of a POST request with a JSON body
// const postData = {
//   name: 'John Doe',
//   email: 'john.doe@example.com',
// };

// authFetch('https://api.example.com/users', {
//   method: 'POST',
//   body: JSON.stringify(postData),
// })
//   .then(response => response.json())
//   .then(data => console.log('Successfully created user:', data))
//   .catch(error => console.error('Error creating user:', error));
