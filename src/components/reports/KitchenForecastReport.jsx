// src/components/reports/KitchenForecastReport.jsx
import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Coffee, Utensils, UtensilsCrossed, Users, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getKitchenForecast } from '@/lib/supabase';

const KitchenForecastReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadForecast = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error: fetchError } = await getKitchenForecast(dateStr);
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setForecast(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  const handlePrint = () => {
    window.print();
  };

  const MealCard = ({ title, icon: Icon, count, rooms, colorClass }) => (
    <Card className={`${colorClass} border-2`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <span className="text-3xl font-bold">{count.total}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Adults: {count.adults}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Children: {count.children}</span>
          </div>
        </div>

        {rooms.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Room Details</p>
            {rooms.map((room, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-2 bg-background/50 rounded">
                <div>
                  <span className="font-medium">Room {room.room_number}</span>
                  <span className="text-muted-foreground ml-2">- {room.guest_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{room.meal_plan}</Badge>
                  <span className="text-muted-foreground">
                    {room.adults}A {room.children > 0 && `+ ${room.children}C`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No guests for this meal</p>
        )}
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400 mb-4">Error loading forecast: {error}</p>
        <Button onClick={() => loadForecast(selectedDate)}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h2>
          <p className="text-sm text-muted-foreground">Kitchen Meal Forecast</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadForecast(selectedDate)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-2xl font-bold">Kitchen Meal Forecast</h1>
        <p className="text-lg">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
        <p className="text-sm text-muted-foreground">Printed: {format(new Date(), 'PPpp')}</p>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MealCard
            title="Breakfast"
            icon={Coffee}
            count={forecast?.breakfast || { adults: 0, children: 0, total: 0, rooms: [] }}
            rooms={forecast?.breakfast?.rooms || []}
            colorClass="border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10"
          />
          <MealCard
            title="Lunch"
            icon={Utensils}
            count={forecast?.lunch || { adults: 0, children: 0, total: 0, rooms: [] }}
            rooms={forecast?.lunch?.rooms || []}
            colorClass="border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10"
          />
          <MealCard
            title="Dinner"
            icon={UtensilsCrossed}
            count={forecast?.dinner || { adults: 0, children: 0, total: 0, rooms: [] }}
            rooms={forecast?.dinner?.rooms || []}
            colorClass="border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10"
          />
        </div>
      )}

      {/* Summary Table for Print */}
      {!loading && forecast && (
        <Card className="print:shadow-none print:border-0">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Total meal counts for {format(selectedDate, 'MMMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Meal</th>
                  <th className="text-center py-2">Adults</th>
                  <th className="text-center py-2">Children</th>
                  <th className="text-center py-2 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-orange-500" /> Breakfast
                  </td>
                  <td className="text-center py-2">{forecast.breakfast?.adults || 0}</td>
                  <td className="text-center py-2">{forecast.breakfast?.children || 0}</td>
                  <td className="text-center py-2 font-bold">{forecast.breakfast?.total || 0}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-green-500" /> Lunch
                  </td>
                  <td className="text-center py-2">{forecast.lunch?.adults || 0}</td>
                  <td className="text-center py-2">{forecast.lunch?.children || 0}</td>
                  <td className="text-center py-2 font-bold">{forecast.lunch?.total || 0}</td>
                </tr>
                <tr>
                  <td className="py-2 flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-purple-500" /> Dinner
                  </td>
                  <td className="text-center py-2">{forecast.dinner?.adults || 0}</td>
                  <td className="text-center py-2">{forecast.dinner?.children || 0}</td>
                  <td className="text-center py-2 font-bold">{forecast.dinner?.total || 0}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KitchenForecastReport;
