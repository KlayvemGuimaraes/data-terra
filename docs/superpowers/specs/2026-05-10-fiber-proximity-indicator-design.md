# Fiber Proximity Indicator

## Goal

Add a visible fiber-cable proximity indicator to DataTerra so nearby fiber routes improve the local connectivity reading. The indicator must make the "closer is better" rule explicit without replacing the existing cable layer.

## Behavior

- Calculate the nearest valid cable route for the selected site or region.
- Convert the nearest distance into a 0-100 score.
- Classify the score into visual bands:
  - `Excelente`: up to 5 km.
  - `Boa`: up to 25 km.
  - `Moderada`: up to 75 km.
  - `Distante`: above 75 km.
  - `Sem dado`: no valid cable geometry.
- Show the score, band, nearest cable name, and distance in the local analysis.
- Keep the existing cable layer checkbox as the source of route visibility.

## Legend And Layers

- Extend the map legend with a compact fiber proximity key using the same visual language as existing status dots.
- Keep the `Cabos de Fibra` layer checkbox responsible for showing and hiding cable routes.
- When the simulated site has a cable proximity result, draw a lightweight nearest-cable indicator in the site layer so it follows the local analysis state and does not create a separate layer toggle.
- The card and list labels must match the layer terminology: `Cabos de Fibra` and `Proximidade da fibra`.

## Data Flow

`SiteAnalysis.analyzeSiteResources` already receives the cable collection. It will return a `fiber` summary derived from the nearest cable calculation. The UI will read `siteAnalysis.fiber` for the score band and nearest-cable text while retaining `siteAnalysis.cables` for raw counts and list items.

## Testing

- Add tests for the score/band thresholds and no-data case.
- Add a UI contract test that checks the fiber legend and local result copy exist.
- Run the full Node test suite from the repo root.
