"use client"
import { useState } from 'react';
import './lookup.css';
import SearchBar from './SearchBar';
import Results from './Results';

export default function Lookup() {

    const [results,setResults] = useState("");
  
    async function performLookup(e) {
        e.preventDefault();
        const formData = new FormData(e.target)
        const searchValue = formData.get("title").toString();
        try {
            const response = await fetch('http://localhost:3000/api/getBikeInfo',{
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json', // Set the content type to JSON
                },
                body: JSON.stringify(searchValue), // Convert the string to JSON format
              });
            const data = await response.json();
            console.log(data)
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        
        
    };
    return (
        <div className="container">
          <div className="search-bar">
            <SearchBar performLookup={performLookup}/>
          </div>
          <div className="results">
            <Results results={results}/>
          </div>
        </div>
    )
}