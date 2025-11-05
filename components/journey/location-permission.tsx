"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, X, AlertCircle } from 'lucide-react';

interface LocationPermissionProps {
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
  loading?: boolean;
  error?: string;
}

export function LocationPermission({
  onAllow,
  onDeny,
  onClose,
  loading,
  error,
}: LocationPermissionProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        <Card className="border-0 shadow-none">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className="rounded-full bg-tfl-blue/10 p-2">
                <MapPin className="h-6 w-6 text-tfl-blue" />
              </div>
              <CardTitle>Enable Location Services</CardTitle>
            </div>
            
            <CardDescription className="mt-2">
              Allow Spitro to access your location to automatically find nearby stations and provide better journey recommendations.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">We use your location to:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Find the nearest stations to your current position</li>
                <li>Provide walking directions to and from stations</li>
                <li>Give more accurate journey times</li>
                <li>Suggest the best routes based on your location</li>
              </ul>
            </div>
            
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Your location data is never stored or shared. It's only used to improve your journey planning experience.
                </span>
              </p>
            </div>
            
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <p className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onDeny}
              disabled={loading}
              className="flex-1"
            >
              Not now
            </Button>
            <Button
              onClick={onAllow}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Getting location...
                </>
              ) : (
                'Allow location access'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
