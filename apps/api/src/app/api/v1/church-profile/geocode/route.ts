import { NextRequest } from 'next/server';
import { z } from 'zod';
import { failure, success } from '@/lib/http';
import { canManageChurchProfile, geocodeSchema } from '@/lib/church-profile';
import { getRequestSession } from '@/lib/request-session';

export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!canManageChurchProfile(session)) return failure('You do not have permission to perform this action.', 403);

    const body = geocodeSchema.parse(await req.json());
    const address = [body.streetAddress, body.city, body.stateOrRegion, body.postalCode, body.country]
      .filter(Boolean)
      .join(', ');

    if (!body.city && !body.country) {
      return failure('Unable to detect coordinates.', 422, {
        reason: 'Enter at least a city and country, or provide coordinates manually.',
      });
    }

    const city = (body.city ?? '').toLowerCase();
    const region = (body.stateOrRegion ?? '').toLowerCase();
    const country = (body.country ?? '').toLowerCase();
    const knownGhanaCoordinates =
      country.includes('ghana') || ['accra', 'kumasi', 'tema', 'cape coast', 'takoradi'].some((name) => city.includes(name));

    if (!knownGhanaCoordinates) {
      return failure('Unable to detect coordinates.', 422, {
        reason: 'External geocoding is not configured. Enter latitude and longitude manually.',
      });
    }

    const coordinates =
      city.includes('kumasi') || region.includes('ashanti')
        ? { latitude: 6.6885, longitude: -1.6244 }
        : city.includes('cape coast') || region.includes('central')
          ? { latitude: 5.1053, longitude: -1.2466 }
          : city.includes('takoradi')
            ? { latitude: 4.9016, longitude: -1.7831 }
            : { latitude: 5.6037, longitude: -0.187 };

    return success({
      ...coordinates,
      formattedAddress: address || 'Accra, Ghana',
      provider: 'placeholder',
    });
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to detect coordinates.', 500);
  }
}
