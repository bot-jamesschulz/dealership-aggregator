import './lookup.css';

export default function SearchBar({performLookup}) {
    return (
        <form onSubmit={performLookup}>
            <div className="centered">
                <input type="text" name="title" placeholder="Search..." />
                <button type="submit">Search</button>
            </div>
        </form>
    )
}