"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Search, MapPin, Train, Bus, TramFront, Zap } from 'lucide-react';
import { getModeColor } from '@/lib/line-colors';
import type { StopPoint } from '@/types/tfl';

interface StationSelectorProps {
  value: string;
  onChange: (value: string, station?: any) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const modeIcons: Record<string, ReactNode> = {
  tube: <Train className="h-4 w-4" />,
  bus: <Bus className="h-4 w-4" />,
  dlr: <Train className="h-4 w-4" />,
  overground: <Train className="h-4 w-4" />,
  tram: <TramFront className="h-4 w-4" />,
  'cable-car': <Zap className="h-4 w-4" />,
  'river-bus': <Bus className="h-4 w-4" />,
};

export function StationSelector({
  value,
  onChange,
  placeholder = "Search for a station",
  label,
  disabled,
  autoFocus,
  className,
}: StationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search
  const searchStations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/stations/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      
      if (data.status === 'success' && data.data.results) {
        setResults(data.data.results);
        setIsOpen(true);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Station search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onChange(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchStations(query);
    }, 300);
  };

  // Handle station selection
  const selectStation = (station: any) => {
    setSearchQuery(station.name);
    onChange(station.name, station);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          selectStation(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search query when value prop changes
  useEffect(() => {
    setSearchQuery(value || '');
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="text-base font-semibold mb-2 block">
          {label}
        </label>
      )}
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="pl-11 pr-4 border-2 focus-visible:border-tfl-blue"
          aria-label="Station search"
          aria-expanded={isOpen}
          aria-controls="station-results"
          aria-activedescendant={selectedIndex >= 0 ? `station-${selectedIndex}` : undefined}
          role="combobox"
          autoComplete="off"
        />
        
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          id="station-results"
          className="absolute z-50 w-full mt-2 bg-background border-2 rounded-lg shadow-xl max-h-72 overflow-auto"
          role="listbox"
        >
          {results.map((station, index) => (
            <button
              key={station.id}
              id={`station-${index}`}
              type="button"
              onClick={() => selectStation(station)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                "flex items-center justify-between text-base",
                selectedIndex === index && "bg-accent text-accent-foreground"
              )}
              role="option"
              aria-selected={selectedIndex === index}
            >
              <div className="flex items-center space-x-3 flex-1">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{station.name}</div>
                  {station.zone && (
                    <div className="text-sm text-muted-foreground">Zone {station.zone}</div>
                  )}
                </div>
              </div>
              
              {/* Transport mode badges */}
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                {station.modes?.map((mode: string) => (
                  <ModeBadge key={mode} mode={mode} />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const color = getModeColor(mode);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
      style={{ background: `${color.background}0D`, color: color.background, borderColor: `${color.background}33` }}
      title={mode}
    >
      {mode}
    </span>
  );
}
