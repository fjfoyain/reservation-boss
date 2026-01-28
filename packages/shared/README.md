# Shared Package

Shared code between backend, web, and mobile applications.

## Structure

- `constants/` - Shared constants (parking spots, configs)
- `utils/` - Shared utility functions
- `types/` - TypeScript type definitions (future)

## Usage

```javascript
import { PARKING_SPOTS, validateEmail, getVisibleWeekRange } from '@parking/shared';
```
