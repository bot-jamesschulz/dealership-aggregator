import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, GeoJSON, Marker} from 'react-leaflet'
import "leaflet/dist/leaflet.css";
import * as turf from '@turf/turf'
import californiaGeoJson from './california.json'
import usGeoJSON from './us.json'
const RADIUS = 25;
const GEOJSON = californiaGeoJson;

// 
function getHexagonPositions(centerPoint) {
  const options = {units: 'kilometers'};
  
  const turfCoords = [
    turf.destination(centerPoint, RADIUS, 0, options).geometry.coordinates,
    turf.destination(centerPoint, RADIUS, 60, options).geometry.coordinates,
    turf.destination(centerPoint, RADIUS, 120, options).geometry.coordinates,
    turf.destination(centerPoint, RADIUS, 180, options).geometry.coordinates,
    turf.destination(centerPoint, RADIUS, 240, options).geometry.coordinates,
    turf.destination(centerPoint, RADIUS, 300, options).geometry.coordinates,
    turf.destination(centerPoint, RADIUS, 0, options).geometry.coordinates
]
  const leafCoords = turfCoords.map(coord => [coord[1], coord[0]]);

  return {turfCoords, leafCoords};

}
// Create a custom icon
const dotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  iconSize: [10, 10], // size of the icon
  iconAnchor: [2.5, 2.5], // point of the icon which will correspond to marker's location
});


const MapTest = () => {
  const [allLeafHexagonPositions, setAllLeafHexagonPositions] = useState([]); // [lat, long]
  const [turfHexagonPositions, setTurfHexagonPositions] = useState([]); // [long, lat]
  const mapRef = useRef(null);
  const bboxRef = useRef();
  const bboxPolygonRef = useRef();
  const bboxPositionsRef = useRef();
  const bboxBottomLeftCornerCoordsRef = useRef();
  const hexagonGridRef = useRef();
  const intersectingHexagonsRef = useRef();
  const intersectingHexagonsCentersRef = useRef();
  const centerRef = useRef();
  const latitude = 36.7783;
  const longitude = -119.4179;



  useEffect(() => {
    

    // Create a bounding box for the GeoJSON data
    bboxRef.current = turf.bbox(GEOJSON);
    const increaseBboxMin = turf.rhumbDestination([bboxRef.current[0],bboxRef.current[1]], 200, -135, { units: 'kilometers' });
    const increaseBboxMax = turf.rhumbDestination([bboxRef.current[2],bboxRef.current[3]], 200, 45, { units: 'kilometers' });
    bboxRef.current = [increaseBboxMin.geometry.coordinates[0], increaseBboxMin.geometry.coordinates[1], increaseBboxMax.geometry.coordinates[0], increaseBboxMax.geometry.coordinates[1]];


    bboxPolygonRef.current = turf.bboxPolygon(bboxRef.current);
    bboxPositionsRef.current = bboxPolygonRef.current.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
    bboxBottomLeftCornerCoordsRef.current = bboxPolygonRef.current.geometry.coordinates[0][0];

    centerRef.current= turf.point(bboxBottomLeftCornerCoordsRef.current);
    let {turfCoords, leafCoords} = getHexagonPositions(centerRef.current);

    const distance = turf.distance(turfCoords[2], turfCoords[1]);
    setTurfHexagonPositions(turfCoords);
    setAllLeafHexagonPositions([leafCoords]);
    

    // Use turf.hexGrid to generate the hexagon grid
    hexagonGridRef.current = turf.hexGrid(bboxRef.current, RADIUS, { units: 'kilometers' });

    const intersectingHexagons = hexagonGridRef.current.features.filter(feature => {
      return turf.booleanIntersects(feature, GEOJSON)
    });
    intersectingHexagonsRef.current = {
      ...hexagonGridRef.current,
      features: intersectingHexagons
    };
    console.log(`intersectingHexagons: ${JSON.stringify(intersectingHexagons)}`);
    console.log(`Hexagon count: ${intersectingHexagons.length}`)

    intersectingHexagonsCentersRef.current = intersectingHexagons.map(feature => turf.center(feature)); 

    
    
  }, []);


  return (
    // Make sure you set the height and width of the map container otherwise the map won't show
    <MapContainer 
        center={[latitude, longitude]}
        zoom={5} 
        ref={mapRef}
        style={{height: "80vh", width: "80vw"}}
        zoomControl={false} 
        touchZoom={false} 
        doubleClickZoom={false} 
        scrollWheelZoom={true} 
        dragging={true}
    >
    <GeoJSON data={GEOJSON} />
    <GeoJSON data={intersectingHexagonsRef.current} color="green"/>
    {intersectingHexagonsCentersRef.current && intersectingHexagonsCentersRef.current.map((feature, index) => (
        <Marker key={index} position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]} icon={dotIcon} />
      ))}
    <Polygon positions={bboxPositionsRef.current} color="red" />
  </MapContainer>
  );
};

export default MapTest;