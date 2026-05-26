from fastmcp import FastMCP

from hvac_mcp.tools.explain_hvac import explain_hvac
from hvac_mcp.tools.get_alerts import get_alerts
from hvac_mcp.tools.get_hvac_status import get_hvac_status
from hvac_mcp.tools.get_recommendation import get_recommendation

mcp = FastMCP(
    "HVAC Maintenance Assistant"
)

mcp.tool()(get_hvac_status)

mcp.tool()(get_alerts)

mcp.tool()(get_recommendation)

mcp.tool()(explain_hvac)


if __name__ == "__main__":
    mcp.run()