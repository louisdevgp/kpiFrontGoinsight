import PageMeta from "../../components/common/PageMeta";

// 👉 nos composants (même layout que ton template)
import AvailabilityMetrics from "../../components/availability/AvailabilityMetrics";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Disponibilité TPE — Dashboard"
        description="Vue d’ensemble des indicateurs de disponibilité TPE (jour/semaine)"
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* ROW 1 : AvailabilityMetrics en pleine largeur */}
        <div className="col-span-12">
          <AvailabilityMetrics />
        </div>

        {/* ROW 2 : gauche + droite */}
        {/* <div className="col-span-12">
          <WeeklyAvailabilityChart />
        </div> */}

        {/* <div className="col-span-12 xl:col-span-5">
          <PolicyWeekCard />
        </div> */}

        {/* ROW 3 */}
        {/* <div className="col-span-12">
          <DailySlotsChart />
        </div> */}

        {/* ROW 4 */}
        {/* <div className="col-span-12 xl:col-span-5">
          <ModelBreakdown />
        </div> */}
        {/* <div className="col-span-12 xl:col-span-7">
          <RecentFailures />
        </div> */}
      </div>
    </>
  );
}
