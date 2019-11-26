#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
# Script file for Question iii
# this function generates 2 text files that report either crude rate or adjusted crude rate computed in the previous questions.
# The first text file describes about
#(a)The average crude/adjusted crude rate of all the states in the U.S.,
#(b) State names with minimum/maximum crude/adjusted crude rate and these values.
# The second text file is comprised of comma separated variables. The first column represents the column name,
# the second column represents the sub-region that the state belongs to and
# the third column represents the crude/adjusted crude rate.
# to run this script tool, it is assumed that the user has already created both or either crude/adjusted crude rate field in the feature layer
# user input is
#(1)feature with table
#(2)field names
#(3)yes/no selection. If the user selected crude rate in the second input, say yes. otherwise say no.
#(4)output file name. File name for the first text file. Full path required.
#(5)state-by-state summary file.File name for the first text file. Full path required.

#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

import arcpy as ap
# function to sort the result
def takesecond(elem):
    return elem[2]
#==============================
# set parameters
#==============================
fc = arcpy.GetParameterAsText(0)
crudefield = arcpy.GetParameterAsText(1)
AdjOrRaw= arcpy.GetParameterAsText(2)
FileName=arcpy.GetParameterAsText(3)
SortedList=arcpy.GetParameterAsText(4)
#==============================
# set variables
#==============================
field=["STATE_NAME",crudefield,'SUB_REGION']#fields to be used in the state-by-state text file.
updates={
    "Total":0,
    "NumberOfStates":0,
    "MinimumRate":10000,
    "MaximumRate":0,
    "MinimumState":"",
    "MaximumState":""}# The dictionary object to make the first text file. 
summary=[]
#======================================
# Collect Crude rate using SearchCursor
#======================================
with ap.da.SearchCursor(fc,field) as cursor:# search 3 fields
    for row in cursor:
        summary.append(row)# append all the rows to "summary" object
        if row[1]!=-99:# crude rate for the 
            updates["Total"]+=row[1]
            updates["NumberOfStates"]+=1
            if updates["MinimumRate"]>row[1]:
                updates["MinimumRate"]=row[1]
                updates["MinimumState"]=row[0]
            if updates["MaximumRate"]<row[1]:
                updates["MaximumRate"]=row[1]
                updates["MaximumState"]=row[0]
summary_sorted=sorted(summary,key=takesecond)
#==============================================
# choose crude rate or adjusted crude rate 
#==============================================
if AdjOrRaw=='true':
    extraword=""
elif AdjOrRaw=='false':
    extraword="age-adjusted "
#==============================================
# Write out the text files
#==============================================
# Avg., Max, and Min crude rate report 
f= open(FileName,"w+")#parameter
f.write("The average " +extraword+"crude rate of all the states in the U.S. is "+str(round(updates["Total"]/updates["NumberOfStates"],2))+ ".\n")
f.write("The state of "+updates["MinimumState"]+ " has the minimum " +extraword+"crude rate, and its value is "+str(updates["MinimumRate"])+ ".\n")
f.write("The state of "+updates["MaximumState"]+ " has the maximum " +extraword+"crude rate, and its value is "+str(updates["MaximumRate"])+ ".")
f.close()
# state-by-state summarty report
summaryFile=open(SortedList,'w+')#parameter
summaryFile.write("State, Region, " +extraword+"CrudeRate\n")#Parameter y/n
for l in range(0,len(summary)):
    if summary_sorted[l][1]!=100000:
        summaryFile.write(summary_sorted[l][0]+", "+summary_sorted[l][2]+", "+str(summary_sorted[l][1])+"\n")
    else:
        summaryFile.write(summary_sorted[l][0]+", "+summary_sorted[l][2]+", "+"NA"+"\n")
summaryFile.close()



