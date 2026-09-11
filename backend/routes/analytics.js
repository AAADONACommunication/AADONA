const express = require("express");
const router = express.Router();
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const analyticsClient = new BetaAnalyticsDataClient();
const verifyToken = require("../middleware/verifyToken");
const { adminLimiter } = require("../middleware/rateLimiters");

router.get("/analytics/summary", verifyToken, adminLimiter, async (req, res) => {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;
    const { range } = req.query;

    let startDate, dailyRange, dailyDimension;
    const endDate = "today";

    switch (range) {
      case "7days":
        startDate = "7daysAgo";
        dailyRange = "7daysAgo";
        dailyDimension = "date";
        break;
      case "30days":
        startDate = "30daysAgo";
        dailyRange = "30daysAgo";
        dailyDimension = "date";
        break;
      case "90days":
        startDate = "90daysAgo";
        dailyRange = "90daysAgo";
        dailyDimension = "yearWeek";
        break;
      case "6months":
        startDate = "180daysAgo";
        dailyRange = "180daysAgo";
        dailyDimension = "yearMonth";
        break;
      case "1year":
        startDate = "365daysAgo";
        dailyRange = "365daysAgo";
        dailyDimension = "yearMonth";
        break;
      default:
        startDate = "30daysAgo";
        dailyRange = "30daysAgo";
        dailyDimension = "date";
    }

    const dateRanges = [{ startDate, endDate }];

    const [
      [summaryReport],
      [topPagesReport],
      [devicesReport],
      [countriesReport],
      [citiesReport],
      [trafficSourceReport],
      [trendReport],
    ] = await Promise.all([
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "sessions" },
          { name: "bounceRate" },
          { name: "newUsers" },
        ],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 8,
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "city" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: dailyRange, endDate }],
        dimensions: [{ name: dailyDimension }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        orderBys: [{ dimension: { dimensionName: dailyDimension } }],
      }),
    ]);

    const metrics = summaryReport.rows?.[0]?.metricValues || [];

    res.json({
      range: range || "30days",
      totalUsers: metrics[0]?.value || "0",
      pageViews: metrics[1]?.value || "0",
      avgSessionDuration:
        Math.round(parseFloat(metrics[2]?.value || "0")) + "s",
      sessions: metrics[3]?.value || "0",
      bounceRate:
        (parseFloat(metrics[4]?.value || "0") * 100).toFixed(1) + "%",
      newUsers: metrics[5]?.value || "0",
      topPages: (topPagesReport.rows || []).map((r) => ({
        page: r.dimensionValues[0].value,
        views: r.metricValues[0].value,
      })),
      devices: (devicesReport.rows || []).map((r) => ({
        device: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
      })),
      countries: (countriesReport.rows || []).map((r) => ({
        country: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
      })),
      cities: (citiesReport.rows || []).map((r) => ({
        city: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
      })),
      trafficSources: (trafficSourceReport.rows || []).map((r) => ({
        source: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
      })),
      trendData: (trendReport.rows || []).map((r) => ({
        label: r.dimensionValues[0].value,
        sessions: r.metricValues[0].value,
        users: r.metricValues[1].value,
      })),
    });
  } catch (err) {
    console.error("GA Analytics Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
