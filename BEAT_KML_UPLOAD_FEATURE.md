# Beat KML Upload & Preview Feature

## Overview
This feature allows City Admins to upload KML files containing road/geographical data, visualize them on a map, and create beats for monitoring and managing road cleaning operations.

## Location
- **Route**: `/city/areas/beats`
- **Access**: City Admin role only
- **Parent Navigation**: Available from `/city/areas` (click "Upload Beat KML" button)

## Features

### 1. 📁 KML File Upload
- Select a **Zone** from the dropdown
- Select a **Ward** within that zone
- Upload a **KML file** (.kml format)
- The file is automatically parsed and previewed before creating beats

### 2. 🗺️ Map Preview
Once a KML file is uploaded:
- All features (Polygons, LineStrings, Points) are visualized on an interactive map
- Each feature is displayed with a different color for easy identification
- Click on any feature to see its details in a popup
- The map automatically zooms to fit all features

### 3. 📋 Data Table
Below the map, a comprehensive table shows:
- Feature number and name
- Geometry type (Polygon/LineString/Point)
- Number of coordinate points
- Associated properties from the KML file

### 4. 🚀 Beat Creation
- After reviewing the preview, click "Upload & Create Beats"
- The system will:
  - Create GeoNode entries for each beat
  - Create SweepingBeat records with full geometry data
  - Store the geometry for future visualization
  - Link beats to the selected ward

### 5. ✅ Success Feedback
- Real-time status updates during upload
- Success message showing number of beats created
- Automatic form reset after successful upload

## KML File Structure
The system expects KML files with:
- `<Placemark>` elements containing:
  - `<name>` - Beat name
  - `<Polygon>`, `<LineString>`, or `<Point>` - Geometry data
  - `<coordinates>` - Geographic coordinates (lng,lat format)
  - Optional: `<description>` - Additional metadata

## Technical Details

### Frontend
- **File**: `/app/city/areas/beats/page.tsx`
- **Map Component**: `/app/city/areas/beats/MapViewer.tsx`
- **Libraries**: Leaflet for map visualization, DOMParser for KML parsing

### Backend
- **Endpoint**: `POST /modules/sweeping/admin/upload-kml`
- **Auth**: Requires City Admin role
- **Processing**: Converts KML to GeoJSON, creates beats with geometry

### Database
- **Table**: `SweepingBeat`
- **Geometry Field**: `geometry` (JSON) - Stores full GeoJSON geometry for visualization

## Usage Flow

1. Navigate to "City Admin" → "Areas & Beat Management"
2. Click "Upload Beat KML" button
3. Select Zone and Ward
4. Upload KML file
5. Review the map preview and data table
6. Click "Upload & Create Beats"
7. Wait for confirmation
8. Beats are now created and ready for assignment

## Benefits

- **Visual Confirmation**: See exactly what's in the KML file before creating beats
- **Data Validation**: Review all features and their properties
- **Accurate Mapping**: Full geometry data enables precise road-to-beat mapping
- **Easy Management**: Organized by zone and ward for better administration
- **Monitoring Ready**: Created beats can be immediately assigned to employees for monitoring

## Future Enhancements

The stored geometry data enables:
- Beat boundary visualization on employee apps
- Route planning for sweeping operations
- Coverage area calculations
- Overlap detection between beats
- Advanced analytics on road coverage
